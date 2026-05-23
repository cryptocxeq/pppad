export type ScrapeContentBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

export type LinkedExcerpt = {
  format: string;
  url: string;
  body: string;
};

export type ParsedScrapeContent = {
  workbookTitle: string | null;
  workbookBlocks: ScrapeContentBlock[];
  linkedExcerpts: LinkedExcerpt[];
  metaHints: string[];
  isPlaceholderForm: boolean;
  isEmpty: boolean;
};

const ZERO_WIDTH = /[\u200B-\u200D\uFEFF]/g;

const WORKBOOK_NOISE = new Set([
  "progress tracking",
  "mark page as complete",
  "view progress",
]);

const LINKED_EXCERPT_RE =
  /Linked ([A-Z]+) text excerpt \((https?:\/\/[^)]+)\):\s*/g;

const META_LINE_RE =
  /^(Image text:|Subtitles \(|Panopto captions \(|Form\/UI cue:)/;

export function parseScrapeContent(raw: string): ParsedScrapeContent {
  const text = raw.replace(ZERO_WIDTH, "");
  const { workbook, linked, metaHints } = splitSections(text);
  const cleaned = cleanWorkbookText(workbook);
  const workbookBlocks = parseWorkbookBlocks(cleaned);
  const workbookTitle = inferTitle(cleaned, workbookBlocks);

  const isPlaceholderForm =
    /yet to be completed/i.test(cleaned) &&
    cleaned.replace(/yet to be completed/gi, "").trim().length < 400 &&
    linked.length === 0;

  const isEmpty =
    workbookBlocks.length === 0 && linked.length === 0 && metaHints.length === 0;

  return {
    workbookTitle,
    workbookBlocks,
    linkedExcerpts: linked,
    metaHints,
    isPlaceholderForm,
    isEmpty,
  };
}

function splitSections(text: string): {
  workbook: string;
  linked: LinkedExcerpt[];
  metaHints: string[];
} {
  const metaHints: string[] = [];
  const linked: LinkedExcerpt[] = [];
  const markers: Array<{ index: number; format: string; url: string; bodyStart: number }> =
    [];

  let m: RegExpExecArray | null;
  const re = new RegExp(LINKED_EXCERPT_RE.source, "g");
  while ((m = re.exec(text)) !== null) {
    markers.push({
      index: m.index,
      format: m[1]!,
      url: m[2]!,
      bodyStart: m.index + m[0].length,
    });
  }

  let workbook = text;
  if (markers.length > 0) {
    workbook = text.slice(0, markers[0]!.index);
    for (let i = 0; i < markers.length; i++) {
      const bodyStart = markers[i]!.bodyStart;
      const bodyEnd = i + 1 < markers.length ? markers[i + 1]!.index : text.length;
      linked.push({
        format: markers[i]!.format,
        url: markers[i]!.url,
        body: text.slice(bodyStart, bodyEnd).trim(),
      });
    }
  }

  const workbookLines: string[] = [];
  for (const line of workbook.split("\n")) {
    const t = line.trim();
    if (!t) {
      workbookLines.push("");
      continue;
    }
    if (META_LINE_RE.test(t)) {
      metaHints.push(t);
      continue;
    }
    workbookLines.push(line);
  }

  return { workbook: workbookLines.join("\n"), linked, metaHints };
}

function cleanWorkbookText(s: string): string {
  return s
    .split("\n")
    .map((line) => line.replace(ZERO_WIDTH, "").trimEnd())
    .filter((line) => {
      const t = line.trim();
      if (!t) return true;
      return !WORKBOOK_NOISE.has(t.toLowerCase());
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function inferTitle(cleaned: string, blocks: ScrapeContentBlock[]): string | null {
  const firstLine = cleaned.split("\n").find((l) => l.trim())?.trim();
  if (!firstLine) return null;
  if (blocks[0]?.type === "heading" && blocks[0].text === firstLine) return firstLine;
  if (firstLine.length <= 120 && !firstLine.includes(".")) return firstLine;
  return blocks[0]?.type === "heading" ? blocks[0].text : null;
}

function parseWorkbookBlocks(workbook: string): ScrapeContentBlock[] {
  const lines = workbook
    .split("\n")
    .map((l) => l.replace(ZERO_WIDTH, "").trim())
    .filter((l, i, arr) => !(l === "" && arr[i - 1] === ""));

  if (lines.length === 0) return [];

  const blocks: ScrapeContentBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;
    if (!line) {
      i += 1;
      continue;
    }

    if (isListLine(line)) {
      const items: string[] = [];
      while (i < lines.length && lines[i] && isListLine(lines[i]!)) {
        items.push(stripListMarker(lines[i]!));
        i += 1;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    if (isHeadingLine(line, lines[i + 1])) {
      blocks.push({ type: "heading", text: line });
      i += 1;
      continue;
    }

    const paraLines: string[] = [line];
    i += 1;
    while (i < lines.length && lines[i] && !isHeadingLine(lines[i]!, lines[i + 1]) && !isListLine(lines[i]!)) {
      paraLines.push(lines[i]!);
      i += 1;
    }
    blocks.push({ type: "paragraph", text: paraLines.join("\n") });
  }

  return blocks;
}

function isListLine(line: string): boolean {
  return /^(\d+[\.\)]\s+|[-•*]\s+|[A-Z][a-z]+,\s)/.test(line);
}

function stripListMarker(line: string): string {
  return line.replace(/^(\d+[\.\)]\s+|[-•*]\s+)/, "").trim();
}

function isHeadingLine(line: string, nextLine?: string): boolean {
  if (line.length > 100) return false;
  if (/^yet to be completed$/i.test(line)) return false;
  if (/^[A-Z0-9][A-Z0-9\s/&'-]{2,}$/.test(line) && line.length < 80) return true;
  if (nextLine && nextLine.length > 80) return line.length < 60 && !line.endsWith(".");
  return line.length < 50 && !line.endsWith(".") && !line.includes("@");
}
