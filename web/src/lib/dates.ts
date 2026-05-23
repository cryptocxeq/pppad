import { formatDistanceToNow, isPast, parseISO } from "date-fns";

/** Format ISO deadline in UTC so labels match module briefs (e.g. 14:00 GMT). */
export function formatDeadline(iso?: string) {
  if (!iso) return null;
  try {
    const d = parseISO(iso);
    const label = new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    }).format(d);

    return {
      label: `${label} GMT`,
      relative: formatDistanceToNow(d, { addSuffix: true }),
      isPast: isPast(d),
      date: d,
    };
  } catch {
    return null;
  }
}
