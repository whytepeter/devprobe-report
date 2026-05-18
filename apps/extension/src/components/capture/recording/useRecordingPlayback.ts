import { ref, computed, watch } from 'vue';

const SPEEDS = [0.5, 1, 1.5, 2] as const;
type Speed = typeof SPEEDS[number];

/**
 * All video playback state and imperative controls in one place.
 *
 * Accepts lazy getters so the composable can be created before the <video>
 * element is mounted — the getters are only called at action time.
 *
 * @param getVideoEl  Returns the <video> HTMLElement (or null before mount).
 * @param getTotalSec Returns the known total duration in seconds.
 */
export function useRecordingPlayback(
  getVideoEl:  () => HTMLVideoElement | null,
  getTotalSec: () => number,
) {
  const currentTimeSec = ref(0);
  const isPlaying      = ref(false);
  const isMuted        = ref(false);
  const playbackRate   = ref<Speed>(1);

  const progress = computed(() => {
    const t = getTotalSec();
    return t > 0 ? currentTimeSec.value / t : 0;
  });

  // ── Playback controls ────────────────────────────────────────────────────
  function togglePlay() {
    const v = getVideoEl();
    if (!v) return;
    v.paused ? v.play() : v.pause();
  }

  function skip(seconds: number) {
    const v = getVideoEl();
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || getTotalSec(), v.currentTime + seconds));
  }

  function seekToMs(ms: number) {
    const t = ms / 1000;
    currentTimeSec.value = t;
    const v = getVideoEl();
    if (v) v.currentTime = t;
  }

  function seekToPercent(pct: number) {
    const dur = getVideoEl()?.duration || getTotalSec();
    const t   = Math.max(0, Math.min(1, pct)) * dur;
    currentTimeSec.value = t;
    const v = getVideoEl();
    if (v) v.currentTime = t;
  }

  function toggleMute() {
    const v = getVideoEl();
    if (!v) return;
    v.muted    = !v.muted;
    isMuted.value = v.muted;
  }

  function cycleSpeed() {
    const idx = SPEEDS.indexOf(playbackRate.value);
    playbackRate.value = SPEEDS[(idx + 1) % SPEEDS.length];
  }

  // ── Native video event handlers (forward from RecordingVideo) ────────────
  function onTimeUpdate() {
    const v = getVideoEl();
    if (v) currentTimeSec.value = v.currentTime;
  }

  function onLoadedMetadata() {
    const v = getVideoEl();
    if (v) v.playbackRate = playbackRate.value;
  }

  function onPlay()  { isPlaying.value = true;  }
  function onPause() { isPlaying.value = false; }
  function onEnded() { isPlaying.value = false; }

  // Keep hardware playback rate in sync whenever the ref changes.
  watch(playbackRate, (r) => {
    const v = getVideoEl();
    if (v) v.playbackRate = r;
  });

  return {
    currentTimeSec,
    isPlaying,
    isMuted,
    playbackRate,
    progress,
    togglePlay,
    skip,
    seekToMs,
    seekToPercent,
    toggleMute,
    cycleSpeed,
    onTimeUpdate,
    onLoadedMetadata,
    onPlay,
    onPause,
    onEnded,
  };
}
