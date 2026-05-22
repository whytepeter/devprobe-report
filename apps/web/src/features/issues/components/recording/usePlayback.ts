/**
 * usePlayback
 * ───────────
 * Thin reactive wrapper around an <video> element. Lets the player
 * components (controls, timeline) read state and issue commands without
 * each one wiring its own event listeners.
 *
 * Exposed reactive state:
 *   • isPlaying / isPaused
 *   • currentMs / durationMs
 *   • progress  (0..1)
 *   • rate      (playbackRate)
 *   • muted
 *
 * Commands:
 *   • play() / pause() / toggle()
 *   • seekTo(ms)             — explicit absolute seek
 *   • seekToPct(0..1)        — fractional seek (timeline scrub)
 *   • setRate(n) / cycleRate()
 *   • toggleMute()
 *   • requestFullscreen()
 *
 * Pass in a Ref<HTMLVideoElement | null> — the composable rebinds listeners
 * whenever the element changes (handy when the source blob URL swaps).
 */
import { ref, computed, watch, type Ref } from 'vue';

const PLAYBACK_RATES = [0.5, 1, 1.25, 1.5, 2] as const;

export function usePlayback(videoEl: Ref<HTMLVideoElement | null>) {
  const isPlaying = ref(false);
  const currentMs = ref(0);
  const durationMs = ref(0);
  const rate = ref(1);
  const muted = ref(false);

  const isPaused = computed(() => !isPlaying.value);
  const progress = computed(() =>
    durationMs.value > 0 ? Math.min(1, currentMs.value / durationMs.value) : 0,
  );

  // ── Bind to the underlying element ──────────────────────────────────────
  // We re-attach when videoEl swaps (e.g. after the blob URL resolves and
  // the <video> is mounted) so the very first frames aren't missed.
  let detach: (() => void) | null = null;

  watch(
    videoEl,
    (el) => {
      detach?.();
      detach = null;
      if (!el) return;

      const onPlay     = () => { isPlaying.value = true; };
      const onPause    = () => { isPlaying.value = false; };
      const onTime     = () => { currentMs.value  = Math.round((el.currentTime || 0) * 1000); };
      const onMeta     = () => {
        const d = el.duration;
        // Some encoders mark unknown duration as Infinity; only commit a finite value.
        if (Number.isFinite(d) && d > 0) durationMs.value = Math.round(d * 1000);
      };
      const onRate     = () => { rate.value = el.playbackRate; };
      const onVol      = () => { muted.value = el.muted; };
      const onEnded    = () => { isPlaying.value = false; };

      el.addEventListener('play',          onPlay);
      el.addEventListener('pause',         onPause);
      el.addEventListener('timeupdate',    onTime);
      el.addEventListener('loadedmetadata',onMeta);
      el.addEventListener('durationchange',onMeta);
      el.addEventListener('ratechange',    onRate);
      el.addEventListener('volumechange',  onVol);
      el.addEventListener('ended',         onEnded);

      // Seed state from the current element values.
      onMeta(); onRate(); onVol(); onTime();
      isPlaying.value = !el.paused;

      detach = () => {
        el.removeEventListener('play',          onPlay);
        el.removeEventListener('pause',         onPause);
        el.removeEventListener('timeupdate',    onTime);
        el.removeEventListener('loadedmetadata',onMeta);
        el.removeEventListener('durationchange',onMeta);
        el.removeEventListener('ratechange',    onRate);
        el.removeEventListener('volumechange',  onVol);
        el.removeEventListener('ended',         onEnded);
      };
    },
    { immediate: true },
  );

  // ── Commands ────────────────────────────────────────────────────────────
  async function play() {
    const el = videoEl.value;
    if (!el) return;
    try { await el.play(); } catch { /* play() rejected — user gesture missing */ }
  }
  function pause() { videoEl.value?.pause(); }
  function toggle() { isPlaying.value ? pause() : void play(); }

  function seekTo(ms: number) {
    const el = videoEl.value;
    if (!el) return;
    el.currentTime = Math.max(0, ms / 1000);
    // Auto-resume on seek so the user can jump between markers fluidly.
    if (el.paused) void play();
  }
  function seekToPct(pct: number) {
    if (!durationMs.value) return;
    seekTo(Math.max(0, Math.min(1, pct)) * durationMs.value);
  }

  function setRate(next: number) {
    const el = videoEl.value;
    if (!el) return;
    el.playbackRate = next;
  }
  function cycleRate() {
    const i = PLAYBACK_RATES.indexOf(rate.value as 0.5 | 1 | 1.25 | 1.5 | 2);
    const next = PLAYBACK_RATES[(i + 1) % PLAYBACK_RATES.length] ?? 1;
    setRate(next);
  }

  function toggleMute() {
    const el = videoEl.value;
    if (!el) return;
    el.muted = !el.muted;
  }

  function requestFullscreen() {
    const el = videoEl.value;
    if (!el) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyEl = el as any;
    (el.requestFullscreen?.bind(el) ?? anyEl.webkitRequestFullscreen?.bind(el))?.();
  }

  return {
    // state
    isPlaying, isPaused, currentMs, durationMs, progress, rate, muted,
    // commands
    play, pause, toggle, seekTo, seekToPct,
    setRate, cycleRate,
    toggleMute, requestFullscreen,
  };
}

export { PLAYBACK_RATES };
