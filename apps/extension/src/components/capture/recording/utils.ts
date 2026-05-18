/** Coerce non-finite (NaN, Infinity) or negative values to 0. */
function safe(n: number): number {
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Format milliseconds as m:ss.d (e.g. 0:12.0, 1:04.5). NaN/Infinity → 0:00.0 */
export function formatDuration(ms: number): string {
  const totalSec = safe(ms) / 1000;
  const m        = Math.floor(totalSec / 60);
  const s        = Math.floor(totalSec % 60);
  const frac     = (totalSec - Math.floor(totalSec)).toFixed(1).slice(1); // ".0"
  return `${m}:${String(s).padStart(2, '0')}${frac}`;
}

/** Format seconds as m:ss.d (e.g. 0:04.0). NaN/Infinity → 0:00.0 */
export function formatTime(sec: number): string {
  const safeSec = safe(sec);
  const m       = Math.floor(safeSec / 60);
  const whole   = Math.floor(safeSec % 60);
  const frac    = (safeSec - Math.floor(safeSec)).toFixed(1).slice(1);
  return `${m}:${String(whole).padStart(2, '0')}${frac}`;
}
