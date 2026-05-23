import type { APIRequestContext, BrowserContext, Frame, Page } from "playwright";

import { parseSrtToPlainText, parseVttToPlainText } from "./vtt.js";

export type PanoptoCaptionCapture = {
  sessionId: string;
  sourceUrl: string;
  label: string;
  text: string;
  error?: string;
};

const PANOPTO_VIEWER_RE = /\/Panopto\/Pages\/Viewer\.aspx\?.*\bid=([0-9a-f-]{36})/i;
const PANOPTO_EMBED_RE = /\/Panopto\/Pages\/Embed\.aspx\?.*\bid=([0-9a-f-]{36})/i;

/**
 * Panopto renders "User created" and other transcripts in the viewer DOM (`ul.event-tab-list`),
 * not only via GenerateSRT. String body so tsx does not inject `__name` into `page.evaluate`.
 */
const PANOPTO_DOM_CAPTION_SCRAPE = `(() => {
  const list =
    document.querySelector('ul.event-tab-list[aria-label="Captions"]') ||
    document.querySelector("ul.event-tab-list");
  if (!list) return null;
  const lines = [];
  for (const li of list.querySelectorAll(":scope > li")) {
    const textEl = li.querySelector(".event-text");
    if (!textEl) continue;
    const body = (textEl.innerText || textEl.textContent || "").replace(/\\s+/g, " ").trim();
    if (!body) continue;
    const timeEl = li.querySelector(".event-time");
    const stamp = timeEl ? (timeEl.textContent || "").trim() : "";
    lines.push(stamp ? stamp + " " + body : body);
  }
  return lines.length ? lines.join("\\n") : null;
})()`;

function clipPanoptoText(text: string, maxBytes: number): string {
  const buf = Buffer.from(text, "utf8");
  if (buf.length <= maxBytes) return text;
  return Buffer.from(buf.subarray(0, maxBytes)).toString("utf8") + "\n…";
}

async function scrapePanoptoDomInFrame(frame: Frame): Promise<string | null> {
  try {
    const v = await frame.evaluate(PANOPTO_DOM_CAPTION_SCRAPE);
    return typeof v === "string" && v.trim().length > 0 ? v : null;
  } catch {
    return null;
  }
}

/** Search embed/viewer iframes on the current page that belong to this session. */
async function scrapePanoptoDomFromOpenPage(page: Page, sessionId: string): Promise<string | null> {
  const sid = sessionId.toLowerCase();
  for (const frame of page.frames()) {
    let u = "";
    try {
      u = frame.url().toLowerCase();
    } catch {
      continue;
    }
    if (!u.includes("panopto")) continue;
    if (!u.includes(sid)) continue;
    const text = await scrapePanoptoDomInFrame(frame);
    if (text) return text;
  }
  return null;
}

/** Open the Panopto viewer/embed URL in a temporary tab (same cookie jar) and scrape the transcript list. */
async function scrapePanoptoDomViaNavigation(
  context: BrowserContext,
  viewerUrl: string,
  timeoutMs: number,
): Promise<string | null> {
  const p = await context.newPage();
  try {
    await p.goto(viewerUrl, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    const waitCap = Math.min(15_000, Math.max(2000, timeoutMs));
    await p.locator("ul.event-tab-list").first().waitFor({ state: "attached", timeout: waitCap }).catch(() => {});
    return await scrapePanoptoDomInFrame(p.mainFrame());
  } catch {
    return null;
  } finally {
    await p.close().catch(() => {});
  }
}

/**
 * Extract Panopto session IDs from a list of page links.
 * Returns unique (origin, sessionId) pairs.
 */
export function detectPanoptoLinks(links: { href: string }[]): Array<{ origin: string; sessionId: string; href: string }> {
  const seen = new Set<string>();
  const results: Array<{ origin: string; sessionId: string; href: string }> = [];

  for (const { href } of links) {
    let match = PANOPTO_VIEWER_RE.exec(href) ?? PANOPTO_EMBED_RE.exec(href);
    if (!match) continue;

    const sessionId = match[1].toLowerCase();
    try {
      const origin = new URL(href).origin;
      const key = `${origin}|${sessionId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({ origin, sessionId, href });
    } catch {
      // invalid URL
    }
  }

  return results;
}

/**
 * Fetch closed captions for a Panopto session using the GenerateSRT endpoint.
 * Falls back to a VTT endpoint variant if SRT fails.
 * Requires the request context to carry the user's authenticated session cookies.
 */
async function fetchPanoptoCaptions(
  request: APIRequestContext,
  origin: string,
  sessionId: string,
  opts: { maxBytes: number; timeout: number },
): Promise<{ text: string; error?: string }> {
  // Try SRT endpoint first (most commonly available)
  const srtUrl = `${origin}/Panopto/Pages/Transcription/GenerateSRT.ashx?id=${sessionId}&language=0`;
  try {
    const res = await request.get(srtUrl, { timeout: opts.timeout });
    if (res.ok()) {
      const body = await res.body();
      if (body.length > opts.maxBytes) {
        return { text: "", error: `Caption file too large (${body.length} bytes)` };
      }
      const raw = Buffer.from(body).toString("utf8");
      // Check it looks like actual caption content (not an error page)
      if (raw.includes("-->")) {
        const text = raw.trimStart().startsWith("WEBVTT")
          ? parseVttToPlainText(raw)
          : parseSrtToPlainText(raw);
        return { text };
      }
    }
  } catch {
    // fall through to next attempt
  }

  // Try language=1 variant (some installations use 1 for English)
  const srtUrl1 = `${origin}/Panopto/Pages/Transcription/GenerateSRT.ashx?id=${sessionId}&language=1`;
  try {
    const res = await request.get(srtUrl1, { timeout: opts.timeout });
    if (res.ok()) {
      const body = await res.body();
      if (body.length > opts.maxBytes) {
        return { text: "", error: `Caption file too large (${body.length} bytes)` };
      }
      const raw = Buffer.from(body).toString("utf8");
      if (raw.includes("-->")) {
        const text = raw.trimStart().startsWith("WEBVTT")
          ? parseVttToPlainText(raw)
          : parseSrtToPlainText(raw);
        return { text };
      }
    }
  } catch {
    // fall through
  }

  return { text: "", error: "No captions found (tried language=0 and language=1)" };
}

/**
 * For each detected Panopto link, attempt to download closed captions (GenerateSRT),
 * then if a Playwright `Page` is provided, scrape the viewer transcript list (`ul.event-tab-list`)
 * from any matching embed iframe or by briefly opening the viewer URL in a disposable tab.
 */
export async function extractPanoptoCaptions(
  request: APIRequestContext,
  links: { href: string }[],
  opts: {
    maxSessions: number;
    maxBytesPerFile: number;
    timeout: number;
  },
  page?: Page | null,
): Promise<PanoptoCaptionCapture[]> {
  const panoptoLinks = detectPanoptoLinks(links);
  const results: PanoptoCaptionCapture[] = [];

  for (const { origin, sessionId, href } of panoptoLinks.slice(0, opts.maxSessions)) {
    let { text, error } = await fetchPanoptoCaptions(request, origin, sessionId, {
      maxBytes: opts.maxBytesPerFile,
      timeout: opts.timeout,
    });

    let scrapedFromDom = false;
    if (text.trim()) {
      text = clipPanoptoText(text, opts.maxBytesPerFile);
    } else if (page) {
      let domText = await scrapePanoptoDomFromOpenPage(page, sessionId);
      if (!domText?.trim()) {
        domText = await scrapePanoptoDomViaNavigation(page.context(), href, opts.timeout);
      }
      if (domText?.trim()) {
        text = clipPanoptoText(domText.trim(), opts.maxBytesPerFile);
        error = undefined;
        scrapedFromDom = true;
        console.log(
          `[panopto] Scraped viewer DOM captions for session ${sessionId.slice(0, 8)}… (${text.length} chars)`,
        );
      }
    }

    if (!text.trim() && !error) {
      error = page
        ? "No Panopto captions (GenerateSRT or viewer DOM)"
        : "No Panopto captions (GenerateSRT; pass Page to also scrape viewer DOM)";
    }

    results.push({
      sessionId,
      sourceUrl: href,
      label: `Panopto ${sessionId.slice(0, 8)}`,
      text,
      error,
    });

    if (text.trim()) {
      if (!scrapedFromDom) {
        console.log(`[panopto] Fetched captions for session ${sessionId.slice(0, 8)}… (${text.length} chars)`);
      }
    } else {
      console.log(`[panopto] No captions for session ${sessionId.slice(0, 8)}…${error ? ` (${error})` : ""}`);
    }
  }

  return results;
}
