/** Lines that are PebblePad chrome, not assignment brief content. */
const NOISE_LINE = /^(skip to main content|pebblepad home|pebble\+ home|atlas\b|save\b|preview\b|i want to\.\.\.|close\b|enter a title for this page)$/i;

const PLACEHOLDER_LINE =
  /this form is yet to be completed|placeholder for student|no content has been added yet/i;

export function isPlaceholderOnlyVisibleText(text: string): boolean {
  const lines = text
    .split(/\n+/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 0 && !NOISE_LINE.test(l));

  if (lines.length === 0) return true;

  const substantive = lines.filter(
    (l) => l.length >= 24 && !PLACEHOLDER_LINE.test(l),
  );

  if (substantive.length === 0) return true;

  const placeholderHits = lines.filter((l) => PLACEHOLDER_LINE.test(l)).length;
  return substantive.length <= 1 && placeholderHits > 0;
}

export function isViewerLoadingShell(text: string): boolean {
  const t = text.replace(/\s+/g, " ").trim().toLowerCase();
  if (t.length > 800) return false;
  return (
    (t.includes("preview asset") || t.includes("loading")) &&
    !t.includes("linked pdf") &&
    t.split(/\s+/).length < 120
  );
}
