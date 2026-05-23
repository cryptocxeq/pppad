export function intInRange(raw: string, fallback: number, min: number, max: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

/** For optional CLI flags like `--max-pages` where invalid input should fail fast. */
export function cappedPositiveInt(raw: string, max: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) {
    throw new Error(`Expected a positive integer, got "${raw}"`);
  }
  return Math.min(max, Math.trunc(n));
}
