import type { PageSnapshot } from "./pageSnapshotTypes.js";

export function mergeTextForAnalysis(snapshot: PageSnapshot): string {
  const chunks: string[] = [];

  if (snapshot.visibleText.trim()) chunks.push(snapshot.visibleText.trim());

  for (const img of snapshot.imageHints) {
    const labelParts = [img.alt?.trim(), img.ariaLabel?.trim(), img.title?.trim()].filter(Boolean);
    if (labelParts.length === 0) continue;
    chunks.push(`Image text: ${labelParts.join(" — ")}`);
  }

  for (const s of snapshot.subtitles) {
    const t = s.text.trim();
    if (!t) continue;
    chunks.push(`Subtitles (${s.label}): ${t}`);
  }

  for (const p of snapshot.linkedPdfs) {
    const fmt = (p.format ?? "pdf").toUpperCase();
    const preview = p.extractedTextPreview.trim();
    const err = p.error?.trim();
    if (preview) {
      chunks.push(`Linked ${fmt} text excerpt (${p.url}): ${preview}`);
    } else if (err) {
      chunks.push(`Linked ${fmt} (${p.url}): ${err}`);
    }
  }

  for (const pc of snapshot.panoptoCaptions) {
    const t = pc.text.trim();
    if (!t) continue;
    chunks.push(`Panopto captions (${pc.label}): ${t}`);
  }

  for (const d of snapshot.domHints.details.slice(0, 15)) {
    chunks.push(`Form/UI cue: ${d}`);
  }

  return chunks.join("\n\n");
}
