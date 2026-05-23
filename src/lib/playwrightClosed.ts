/**
 * True when Playwright reports the page/context/browser was closed (user quit or crash).
 * Follows `error.cause` a few levels for wrapped errors.
 */
export function isPlaywrightTargetClosedError(err: unknown, depth = 0): boolean {
  if (depth > 8 || !err || typeof err !== "object") return false;
  const e = err as { name?: string; message?: string; cause?: unknown };
  if (e.name === "TargetClosedError") return true;
  const msg = typeof e.message === "string" ? e.message : "";
  // Playwright's canonical message; avoid loose "closed" substring matches.
  if (/\bTarget page, context or browser has been closed\b/i.test(msg)) return true;
  if (e.cause !== undefined && e.cause !== null) {
    return isPlaywrightTargetClosedError(e.cause, depth + 1);
  }
  return false;
}
