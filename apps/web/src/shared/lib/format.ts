/**
 * Relative time formatter. Accepts a Date, an ISO 8601 string, or an epoch
 * millisecond number — API responses serialise dates as strings so we have
 * to normalise here at the call site.
 */
export function timeAgo(input: Date | string | number | null | undefined): string {
  if (input == null) return "";
  const date = input instanceof Date ? input : new Date(input);
  const ts = date.getTime();
  if (Number.isNaN(ts)) return "";

  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function truncate(str: string, max: number): string {
  return str.length <= max ? str : str.slice(0, max).trimEnd() + "…";
}
