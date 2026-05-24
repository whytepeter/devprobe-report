/**
 * recording-state
 * ───────────────
 * Module-level reactive state shared between the content script (which owns
 * the MediaRecorder lifecycle, timer, capture-streams + element-blur) and the
 * FloatingLauncher (which TRANSFORMS into the recording toolbar while a
 * recording is active).
 *
 * Mirrors annotation-state:
 *   • content script → launcher : active / state / elapsedMs / blurActive
 *   • launcher → content script : pause-toggle / stop / blur intents (counters
 *     the content script watches).
 *
 * Both run as separate Vue trees in their own shadow roots but import this
 * same module, so the refs are shared.
 */
import { computed, ref } from 'vue';

export type RecState = 'recording' | 'paused';

const active     = ref(false);
const recState   = ref<RecState>('recording');
const elapsedMs  = ref(0);
const blurActive = ref(false);

// Launcher → content-script intents (counter bumps the content script watches).
const togglePauseRequested = ref(0);
const stopRequested        = ref(0);
const blurRequested        = ref(0);

function setActive(next: boolean) {
  active.value = next;
  if (!next) {
    recState.value   = 'recording';
    elapsedMs.value  = 0;
    blurActive.value = false;
  }
}
function setState(s: RecState)        { recState.value = s; }
function setElapsed(ms: number)        { elapsedMs.value = Math.max(0, ms); }
function setBlurActive(b: boolean)     { blurActive.value = b; }

/** Launcher → content: toggle pause/resume. */
function requestTogglePause() { togglePauseRequested.value++; }
/** Launcher → content: stop the recording. */
function requestStop()        { stopRequested.value++; }
/** Launcher → content: toggle sticky element-blur pick mode. */
function requestBlur()        { blurRequested.value++; }

export function useRecordingState() {
  return {
    active:     computed(() => active.value),
    state:      computed(() => recState.value),
    elapsedMs:  computed(() => elapsedMs.value),
    blurActive: computed(() => blurActive.value),
    togglePauseRequested: computed(() => togglePauseRequested.value),
    stopRequested:        computed(() => stopRequested.value),
    blurRequested:        computed(() => blurRequested.value),

    // writers (content script)
    setActive,
    setState,
    setElapsed,
    setBlurActive,

    // intents (launcher)
    requestTogglePause,
    requestStop,
    requestBlur,
  };
}
