/**
 * Formatters for the Network tab — byte sizes + request durations.
 * Kept local to the network folder; both the row and the detail drawer use them.
 */

/** Human-readable byte size. `null`/undefined → "—". */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

/** Request duration in ms → "120ms" / "1.2s". `null`/undefined → "—". */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)}s`;
}

/** mm:ss timestamp from recording start. */
export function formatClock(ms: number | null | undefined): string {
  const s = Math.max(0, Math.floor((ms ?? 0) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
