function normalizeCueText(lines: string[]): string {
  return lines
    .map((l) => l.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Best-effort WebVTT → plain text. Does not preserve timestamps.
 * Only fetches/parses caption files — never downloads video binaries.
 */
export function parseVttToPlainText(vtt: string): string {
  const rawLines = vtt.replace(/^\uFEFF/, "").split(/\r?\n/);

  const cueLines: string[] = [];
  let skippingNote = false;

  for (const line of rawLines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("NOTE")) {
      skippingNote = trimmed === "NOTE" || trimmed.startsWith("NOTE ");
      continue;
    }

    if (skippingNote) {
      if (trimmed === "") skippingNote = false;
      continue;
    }

    if (trimmed === "" || trimmed.startsWith("WEBVTT")) continue;
    if (/^\d+$/.test(trimmed)) continue;
    if (trimmed.includes("-->")) continue;
    if (trimmed.startsWith("STYLE") || trimmed.startsWith("REGION")) continue;

    cueLines.push(trimmed);
  }

  return normalizeCueText(cueLines);
}

/**
 * Best-effort SubRip (.srt) → plain text.
 */
export function parseSrtToPlainText(srt: string): string {
  const blocks = srt.replace(/^\uFEFF/, "").trim().split(/\n\s*\n/);
  const cueLines: string[] = [];

  for (const block of blocks) {
    const lines = block.split(/\r?\n/).map((l) => l.trimEnd());
    const nonEmpty = lines.map((l) => l.trim()).filter((l) => l.length > 0);
    if (nonEmpty.length === 0) continue;

    let i = 0;
    if (/^\d+$/.test(nonEmpty[0] ?? "")) i += 1;
    if (i < nonEmpty.length && /^\d{2}:\d{2}:\d{2}[,.]\d{3}\s+-->\s+\d{2}:\d{2}:\d{2}[,.]\d{3}/.test(nonEmpty[i] ?? "")) {
      i += 1;
    }

    for (; i < nonEmpty.length; i += 1) {
      const line = nonEmpty[i] ?? "";
      if (/^\d{2}:\d{2}:\d{2}[,.]\d{3}\s+-->/.test(line)) continue;
      cueLines.push(line);
    }
  }

  return normalizeCueText(cueLines);
}
