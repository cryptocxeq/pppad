export type HeuristicAnalysis = {
  wordCountHints: string[];
  deadlineHints: string[];
  uploadHints: string[];
  reflectionHints: string[];
  checklistHints: string[];
  unclear: string[];
};

const WORD_RANGE_RE = /(\d+)\s*[-–]\s*(\d+)\s*words?\b/gi;
const WORD_SINGLE_RE = /\b(?:approx\.?\s*)?(\d+)\s*words?\b/gi;

const DATE_LIKE_RE = /\b\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}\b/;
const ISO_DATE_RE = /\b\d{4}-\d{2}-\d{2}\b/;

const DEADLINE_CUE_RE = /\b(deadline|due date|due:|submit by|hand-?in|submissions?\s+close)\b/i;

const UPLOAD_CUE_RE = /\b(upload|attach(?:ment)?|evidence\s+file|submit\s+(?:a|your)\s+file)\b/i;

const ASSESSABLE_RE =
  /\b(assessment|rubric|reflection|upload|evidence|portfolio|workbook)\b/i;

function uniq(items: string[]): string[] {
  return [...new Set(items.map((s) => s.trim()).filter(Boolean))];
}

export function analyzeVisibleText(text: string): HeuristicAnalysis {
  const wordCountHints: string[] = [];
  const deadlineHints: string[] = [];
  const uploadHints: string[] = [];
  const reflectionHints: string[] = [];
  const checklistHints: string[] = [];
  const unclear: string[] = [];

  const normalized = text.replace(/\s+/g, " ").trim();

  for (const match of normalized.matchAll(WORD_RANGE_RE)) {
    const a = match[1] ?? "";
    const b = match[2] ?? "";
    if (a && b) wordCountHints.push(`Word count guidance: ${a}-${b} words`);
  }

  if (wordCountHints.length === 0) {
    for (const match of normalized.matchAll(WORD_SINGLE_RE)) {
      const n = match[1] ?? "";
      if (n) wordCountHints.push(`Word count guidance: ${n} words`);
    }
  }

  if (UPLOAD_CUE_RE.test(normalized)) {
    uploadHints.push("Text mentions uploading/attaching evidence or files.");
  }

  if (/\breflection\b/i.test(normalized)) {
    reflectionHints.push("Text mentions a reflection task.");
  }

  if (/\bchecklist\b/i.test(normalized) || /\btick\b/i.test(normalized)) {
    checklistHints.push("Text mentions checklist-style completion cues.");
  }

  if (DEADLINE_CUE_RE.test(normalized)) {
    const dateMatch = normalized.match(DATE_LIKE_RE) ?? normalized.match(ISO_DATE_RE);
    if (dateMatch) {
      deadlineHints.push(`Deadline cue with date: ${dateMatch[0]}`);
    } else {
      unclear.push("Deadline language present, but no explicit calendar date found in captured text.");
    }
  } else if (DATE_LIKE_RE.test(normalized) || ISO_DATE_RE.test(normalized)) {
    const dateMatch = normalized.match(DATE_LIKE_RE) ?? normalized.match(ISO_DATE_RE);
    if (dateMatch) deadlineHints.push(`Date-like text detected: ${dateMatch[0]}`);
  }

  const hasDeadlineHint = deadlineHints.length > 0;
  const hasDateLike = DATE_LIKE_RE.test(normalized) || ISO_DATE_RE.test(normalized);
  const looksAssessable =
    ASSESSABLE_RE.test(normalized) &&
    (/\b(write|describe|explain|upload|submit)\b/i.test(normalized) ||
      /\bassessment\b/i.test(normalized));

  if (looksAssessable && !hasDeadlineHint && !hasDateLike) {
    unclear.push("Deadline not visible in captured text.");
  }

  return {
    wordCountHints: uniq(wordCountHints),
    deadlineHints: uniq(deadlineHints),
    uploadHints: uniq(uploadHints),
    reflectionHints: uniq(reflectionHints),
    checklistHints: uniq(checklistHints),
    unclear: uniq(unclear),
  };
}
