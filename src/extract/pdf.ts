import type { APIRequestContext, Page } from "playwright";
import { PDFParse } from "pdf-parse";

import { pauseForCrawlCapture } from "../browser/crawlDiscovery.js";
import { truncateUtf16Chars } from "../lib/text.js";
import { extractDocxPlainText, extractPptxPlainText, sniffOpenXmlKindFromBuffer } from "./officeZipText.js";
import type { LinkedDocumentFormat, LinkedPdfCapture } from "./pageSnapshotTypes.js";

export type PdfExtractResult = {
  textPreview: string;
  pageCount: number | null;
};

/** Known file kind, or `probe` for PebblePad `File/Original?id=` URLs with no filename in `href`. */
export type DocumentKindOrProbe = LinkedDocumentFormat | "probe";

export async function extractPdfTextPreview(buffer: Buffer, previewChars: number): Promise<PdfExtractResult> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    const fullText = String(result.text ?? "").replace(/\s+/g, " ").trim();
    return {
      textPreview: truncateUtf16Chars(fullText, previewChars),
      pageCount: typeof result.total === "number" ? result.total : null,
    };
  } finally {
    await parser.destroy();
  }
}

function extensionFromString(s: string): LinkedDocumentFormat | null {
  const m = /\.(pdf|pptx|ppt|docx|doc)(?:$|[?#])/i.exec(s);
  if (!m) return null;
  return m[1].toLowerCase() as LinkedDocumentFormat;
}

/**
 * Classify workbook-linked documents from URL path, `filename=` / `file=` / `name=` query hints,
 * or the HTML `download` attribute filename (PebblePad download buttons).
 */
export function classifyDocumentHref(href: string, hints?: { download?: string }): LinkedDocumentFormat | null {
  if (hints?.download) {
    const fromDl = extensionFromString(decodeURIComponent(hints.download.trim()).toLowerCase());
    if (fromDl) return fromDl;
  }
  try {
    const u = new URL(href);
    const path = u.pathname.toLowerCase();
    const fromPath = extensionFromString(path);
    if (fromPath) return fromPath;
    for (const key of ["filename", "file", "name"]) {
      const raw = u.searchParams.get(key);
      if (!raw) continue;
      const dec = decodeURIComponent(raw).toLowerCase();
      const fromParam = extensionFromString(dec);
      if (fromParam) return fromParam;
    }
    return null;
  } catch {
    return null;
  }
}

/** PebblePad binary download API: `/.../File/Original?id=` (no extension in `href`). */
export function isPebblePadBinaryDownloadApiHref(href: string): boolean {
  try {
    const u = new URL(href);
    if (!u.searchParams.get("id")) return false;
    const p = u.pathname.replace(/\\/g, "/").toLowerCase();
    return p.includes("/file/original");
  } catch {
    return false;
  }
}

export function classifyLinkForDocumentFetch(link: { href: string; download?: string }): DocumentKindOrProbe | null {
  const k = classifyDocumentHref(link.href, { download: link.download });
  if (k) return k;
  if (isPebblePadBinaryDownloadApiHref(link.href)) return "probe";
  return null;
}

function contentTypeMatchesKind(kind: LinkedDocumentFormat, contentType: string): boolean {
  const ct = contentType.toLowerCase();
  if (ct.includes("octet-stream")) return true;
  switch (kind) {
    case "pdf":
      return ct.includes("pdf");
    case "pptx":
      return (
        ct.includes("presentationml.presentation") ||
        ct.includes("application/zip") ||
        ct.includes("officedocument")
      );
    case "docx":
      return (
        ct.includes("wordprocessingml.document") ||
        ct.includes("application/zip") ||
        ct.includes("officedocument")
      );
    default:
      return false;
  }
}

/** PebblePad hash-router asset viewer (PPT/PDF/etc. open inside the SPA after load). */
export function isPebblePadViewerHref(href: string): boolean {
  try {
    const u = new URL(href);
    if (/#\/viewer\/[A-Za-z0-9]+/.test(u.hash)) return true;
    if (/\/viewer\/[A-Za-z0-9]+/.test(`${u.pathname}${u.hash}`)) return true;
    return false;
  } catch {
    return false;
  }
}

function buildOrderedClassifiedLinks(
  links: { href: string; download?: string }[],
): Array<{ href: string; kind: DocumentKindOrProbe }> {
  const seen = new Set<string>();
  const ordered: Array<{ href: string; kind: DocumentKindOrProbe }> = [];
  for (const link of links) {
    const kind = classifyLinkForDocumentFetch(link);
    if (!kind) continue;
    if (seen.has(link.href)) continue;
    seen.add(link.href);
    ordered.push({ href: link.href, kind });
  }
  return ordered;
}

async function extractBufferToCapture(
  href: string,
  kind: LinkedDocumentFormat,
  buf: Buffer,
  bodyLen: number,
  opts: { pdfPreviewChars: number },
): Promise<LinkedPdfCapture> {
  if (kind === "pdf") {
    const { textPreview } = await extractPdfTextPreview(buf, opts.pdfPreviewChars);
    return { url: href, extractedTextPreview: textPreview, bytesRead: bodyLen, format: "pdf" };
  }
  if (kind === "pptx") {
    const textPreview = await extractPptxPlainText(buf, opts.pdfPreviewChars);
    return {
      url: href,
      extractedTextPreview: textPreview,
      bytesRead: bodyLen,
      format: "pptx",
      ...(textPreview.trim() ? {} : { error: "No text extracted from PPTX (empty or unreadable)" }),
    };
  }
  const textPreview = await extractDocxPlainText(buf, opts.pdfPreviewChars);
  return {
    url: href,
    extractedTextPreview: textPreview,
    bytesRead: bodyLen,
    format: "docx",
    ...(textPreview.trim() ? {} : { error: "No text extracted from DOCX (empty or unreadable)" }),
  };
}

async function resolveKindFromHttpResponse(
  contentType: string,
  buf: Buffer,
): Promise<LinkedDocumentFormat | null> {
  const ct = contentType.toLowerCase();
  if (ct.includes("pdf")) return "pdf";
  if (ct.includes("presentationml.presentation") || ct.includes("powerpoint")) return "pptx";
  if (ct.includes("wordprocessingml.document")) return "docx";
  if (ct.includes("application/zip") || ct.includes("octet-stream") || ct.trim() === "") {
    if (buf.length >= 4 && buf.subarray(0, 4).toString("latin1") === "%PDF") return "pdf";
    if (buf.length >= 2 && buf[0] === 0x50 && buf[1] === 0x4b) {
      return await sniffOpenXmlKindFromBuffer(buf);
    }
  }
  return null;
}

async function fetchAndExtractOneDocument(
  request: APIRequestContext,
  href: string,
  kind: DocumentKindOrProbe,
  opts: { maxPdfBytes: number; pdfPreviewChars: number },
): Promise<LinkedPdfCapture> {
  if (kind === "ppt" || kind === "doc") {
    return {
      url: href,
      extractedTextPreview: "",
      format: kind,
      error: `Legacy ${kind === "ppt" ? ".ppt" : ".doc"} is not text-extracted here — open in Office or convert to ${kind === "ppt" ? ".pptx" : ".docx"}`,
    };
  }

  if (kind === "probe") {
    try {
      const res = await request.get(href, { timeout: 60_000 });
      if (!res.ok()) {
        return {
          url: href,
          extractedTextPreview: "",
          format: "pdf",
          error: `HTTP ${res.status()} (binary API)`,
        };
      }
      const headers = res.headers();
      const contentType = (headers["content-type"] || "").toLowerCase();
      const body = await res.body();
      if (body.length > opts.maxPdfBytes) {
        return {
          url: href,
          extractedTextPreview: "",
          format: "pdf",
          error: `File too large (${body.length} bytes > ${opts.maxPdfBytes})`,
        };
      }
      const buf = Buffer.from(body);
      const resolved = await resolveKindFromHttpResponse(contentType, buf);
      if (!resolved) {
        return {
          url: href,
          extractedTextPreview: "",
          format: "pdf",
          error: `Could not determine file type (content-type: ${contentType || "unknown"})`,
        };
      }
      return await extractBufferToCapture(href, resolved, buf, body.length, opts);
    } catch (e) {
      return {
        url: href,
        extractedTextPreview: "",
        format: "pdf",
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  try {
    const res = await request.get(href, { timeout: 60_000 });
    if (!res.ok()) {
      return {
        url: href,
        extractedTextPreview: "",
        format: kind,
        error: `HTTP ${res.status()}`,
      };
    }

    const headers = res.headers();
    const contentType = (headers["content-type"] || "").toLowerCase();
    if (!contentTypeMatchesKind(kind, contentType)) {
      return {
        url: href,
        extractedTextPreview: "",
        format: kind,
        error: `Unexpected content-type: ${contentType || "unknown"}`,
      };
    }

    const body = await res.body();
    if (body.length > opts.maxPdfBytes) {
      return {
        url: href,
        extractedTextPreview: "",
        format: kind,
        error: `File too large (${body.length} bytes > ${opts.maxPdfBytes})`,
      };
    }

    const buf = Buffer.from(body);
    return await extractBufferToCapture(href, kind, buf, body.length, opts);
  } catch (e) {
    return {
      url: href,
      extractedTextPreview: "",
      format: kind,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

const ASSET_LINK_HARVEST_EXPR = `(() => {
  const out = [];
  const seen = new Set();
  function pushEntry(raw, download) {
    if (!raw || typeof raw !== "string") return;
    try {
      const abs = new URL(raw, document.baseURI).href;
      const key = abs + "\\t" + (download || "");
      if (seen.has(key)) return;
      seen.add(key);
      const o = { href: abs };
      if (download && String(download).trim()) o.download = String(download).trim();
      out.push(o);
    } catch {}
  }
  document.querySelectorAll('a[href]').forEach((a) => {
    const dl = a.getAttribute("download");
    pushEntry(a.getAttribute("href"), dl);
    pushEntry(a.href, dl);
  });
  document.querySelectorAll('iframe[src], embed[src], frame[src]').forEach((el) => {
    pushEntry(el.getAttribute("src"), null);
  });
  document.querySelectorAll('object[data]').forEach((el) => {
    pushEntry(el.getAttribute("data"), null);
  });
  return out.slice(0, 800);
})()`;

export type ViewerDocumentDigestOpts = {
  maxPdfBytes: number;
  maxPdfsPerPage: number;
  pdfPreviewChars: number;
  maxViewerDigestsPerSnapshot: number;
  viewerSpinnerWaitMs: number;
  viewerSettleMs: number;
  viewerGotoTimeoutMs: number;
};

/**
 * Open same-origin PebblePad `#/viewer/...` routes in a temporary tab, wait for the SPA,
 * then harvest `<a href>`, `<iframe src>`, etc. for PDF/PPTX/DOCX URLs and extract text like normal links.
 */
export async function extractLinkedDocumentsFromPebblePadViewerPages(
  page: Page,
  links: { href: string; download?: string }[],
  opts: ViewerDocumentDigestOpts,
  already: LinkedPdfCapture[],
): Promise<LinkedPdfCapture[]> {
  const remainingSlots = opts.maxPdfsPerPage - already.length;
  if (remainingSlots <= 0) return [];

  let pageOrigin: string;
  try {
    pageOrigin = new URL(page.url()).origin;
  } catch {
    return [];
  }

  const seen = new Set<string>(already.map((x) => x.url));
  const viewerUrls: string[] = [];
  const seenViewer = new Set<string>();
  for (const { href } of links) {
    if (!isPebblePadViewerHref(href)) continue;
    try {
      if (new URL(href).origin !== pageOrigin) continue;
    } catch {
      continue;
    }
    if (seenViewer.has(href)) continue;
    seenViewer.add(href);
    viewerUrls.push(href);
    if (viewerUrls.length >= opts.maxViewerDigestsPerSnapshot) break;
  }

  if (viewerUrls.length === 0) return [];

  const request = page.context().request;
  const extra: LinkedPdfCapture[] = [];
  const context = page.context();

  for (const vurl of viewerUrls) {
    if (extra.length >= remainingSlots) break;
    const vp = await context.newPage();
    try {
      await vp.goto(vurl, { waitUntil: "domcontentloaded", timeout: opts.viewerGotoTimeoutMs });
      await pauseForCrawlCapture(vp, {
        spinnerWaitMs: opts.viewerSpinnerWaitMs,
        autoScroll: true,
        scrollPauseMs: 400,
        settleMs: opts.viewerSettleMs,
      });
      const assets = (await vp.evaluate(ASSET_LINK_HARVEST_EXPR)) as { href: string; download?: string }[];
      const ordered = buildOrderedClassifiedLinks(assets);
      for (const { href, kind } of ordered) {
        if (extra.length >= remainingSlots) break;
        if (seen.has(href)) continue;
        seen.add(href);
        extra.push(await fetchAndExtractOneDocument(request, href, kind, opts));
      }
    } catch (e) {
      console.warn(
        `[pebblepad] Could not digest viewer page for linked documents: ${vurl}\n${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      await vp.close().catch(() => {});
    }
  }

  return extra;
}

/**
 * Download linked PDF / Office Open XML documents and pull plain-text previews for assessment.
 * Legacy `.ppt` / binary `.doc` are reported with an explicit error (not supported here).
 */
export async function extractLinkedDocumentSnippets(
  page: Page,
  links: { href: string; download?: string }[],
  opts: {
    maxPdfBytes: number;
    maxPdfsPerPage: number;
    pdfPreviewChars: number;
  },
): Promise<LinkedPdfCapture[]> {
  const ordered = buildOrderedClassifiedLinks(links);
  const request = page.context().request;
  const results: LinkedPdfCapture[] = [];

  for (const { href, kind } of ordered.slice(0, opts.maxPdfsPerPage)) {
    results.push(await fetchAndExtractOneDocument(request, href, kind, opts));
  }

  return results;
}

/** @deprecated Use {@link extractLinkedDocumentSnippets}; name kept for call sites. */
export const extractLinkedPdfSnippets = extractLinkedDocumentSnippets;
