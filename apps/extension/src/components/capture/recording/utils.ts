/** Format milliseconds as m:ss.d (e.g. 0:12.0, 1:04.5) */
export function formatDuration(ms: number): string {
  const totalSec = ms / 1000;
  const m        = Math.floor(totalSec / 60);
  const s        = Math.floor(totalSec % 60);
  const frac     = (totalSec - Math.floor(totalSec)).toFixed(1).slice(1); // ".0"
  return `${m}:${String(s).padStart(2, '0')}${frac}`;
}

/** Format seconds as m:ss.d (e.g. 0:04.0) */
export function formatTime(sec: number): string {
  const m     = Math.floor(sec / 60);
  const whole = Math.floor(sec % 60);
  const frac  = (sec - Math.floor(sec)).toFixed(1).slice(1);
  return `${m}:${String(whole).padStart(2, '0')}${frac}`;
}
