import type { APIRequestContext, Page } from "playwright";

import { parseSrtToPlainText, parseVttToPlainText } from "./vtt.js";

export type SubtitleTrackRef = {
  url: string;
  label: string;
  kind: string;
  format: "vtt" | "srt" | "unknown";
};

export type SubtitleCapture = {
  label: string;
  url: string;
  format: string;
  text: string;
  error?: string;
};

/**
 * Collect caption/subtitle track URLs from `<video><track …>` elements.
 * This intentionally targets text tracks only — it does **not** download video files.
 *
 * When `contentScope` is provided, only looks for videos inside matching elements.
 */
export async function collectSubtitleTrackRefs(page: Page, contentScope?: string | null): Promise<SubtitleTrackRef[]> {
  const expression = `(() => {
    const scope = ${JSON.stringify(contentScope ?? null)};
    const out = [];
    const seen = new Set();
    let roots;
    if (scope) {
      const scoped = document.querySelectorAll(scope);
      roots = scoped.length > 0 ? Array.from(scoped) : [document.body];
    } else {
      roots = [document.body];
    }
    for (const root of roots) {
      const videos = root.querySelectorAll("video");
      for (const video of videos) {
        for (const track of video.querySelectorAll("track")) {
          const src = track.getAttribute("src") || "";
          if (!src) continue;
          const kind = (track.getAttribute("kind") || "").toLowerCase();
          if (kind && kind !== "subtitles" && kind !== "captions") continue;
          const resolved = new URL(src, document.baseURI).href;
          if (seen.has(resolved)) continue;
          seen.add(resolved);
          const label = track.label || kind || "subtitles";
          const lower = resolved.toLowerCase();
          const format = lower.endsWith(".vtt") ? "vtt" : lower.endsWith(".srt") ? "srt" : "unknown";
          out.push({ url: resolved, label, kind: kind || "subtitles", format });
        }
      }
    }
    return out;
  })()`;
  return page.evaluate(expression);
}

function guessCaptionFormat(raw: string, url: string): "vtt" | "srt" {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.endsWith(".vtt")) return "vtt";
  if (lowerUrl.endsWith(".srt")) return "srt";
  if (raw.trimStart().startsWith("WEBVTT")) return "vtt";
  return "srt";
}

export async function fetchSubtitleCaptions(
  request: APIRequestContext,
  refs: SubtitleTrackRef[],
  opts: { maxBytesPerFile: number; maxFiles: number },
): Promise<SubtitleCapture[]> {
  const results: SubtitleCapture[] = [];

  for (const ref of refs.slice(0, opts.maxFiles)) {
    try {
      const res = await request.get(ref.url, { timeout: 60_000 });
      if (!res.ok()) {
        results.push({
          label: ref.label,
          url: ref.url,
          format: ref.format,
          text: "",
          error: `HTTP ${res.status()}`,
        });
        continue;
      }

      const body = await res.body();
      const clipped = body.length > opts.maxBytesPerFile ? body.subarray(0, opts.maxBytesPerFile) : body;
      const raw = Buffer.from(clipped).toString("utf8");

      const format = ref.format === "unknown" ? guessCaptionFormat(raw, ref.url) : ref.format;
      const text = format === "srt" ? parseSrtToPlainText(raw) : parseVttToPlainText(raw);

      results.push({ label: ref.label, url: ref.url, format, text });
    } catch (e) {
      results.push({
        label: ref.label,
        url: ref.url,
        format: ref.format,
        text: "",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return results;
}
