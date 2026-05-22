/**
 * annotation-state
 * ────────────────
 * Module-level reactive state shared between the AnnotationOverlay (which
 * owns the actual flow) and the FloatingLauncher (which IS the toolbar
 * now — start pinning, view pin count, exit).
 *
 * Both surfaces are Vue apps mounted in their own shadow roots, but they
 * import this same module, so the same `ref` instance is observed in both.
 *
 * Lifecycle:
 *   • Launcher → user clicks "Annotate" → dispatches `dp:start-annotation`
 *     → content script mounts AnnotationOverlay → overlay calls
 *       `state.setActive(true)` on mount.
 *   • Overlay submits / loads pins → calls `state.setPinCount(n)`.
 *   • Launcher button click in active state → state.startPlacing() etc.
 *   • Overlay unmounts → state.setActive(false).
 */
import { computed, ref } from 'vue';

export type AnnotationOverlayMode = 'view' | 'place';

const active   = ref(false);
const mode     = ref<AnnotationOverlayMode>('view');
const pinCount = ref(0);

// Imperative bridge: the launcher fires these intents, the overlay listens
// to them. Lighter than emit-up-prop-down across two separate Vue trees.
const placeRequested  = ref(0);  // monotonically incremented; overlay watches
const exitRequested   = ref(0);
const cancelRequested = ref(0);

function setActive(next: boolean) {
  active.value = next;
  if (!next) {
    mode.value     = 'view';
    pinCount.value = 0;
  }
}

function setMode(next: AnnotationOverlayMode)   { mode.value = next; }
function setPinCount(n: number)                  { pinCount.value = Math.max(0, n); }

/** Launcher → overlay: enter PLACE mode (highlight + click-to-drop). */
function requestPlace()  { placeRequested.value++; }
/** Launcher → overlay: cancel PLACE mode (back to VIEW). */
function requestCancel() { cancelRequested.value++; }
/** Launcher → overlay: exit annotation entirely. */
function requestExit()   { exitRequested.value++; }

export function useAnnotationState() {
  return {
    // reactive state (read-only intent — write via setters below)
    active:   computed(() => active.value),
    mode:     computed(() => mode.value),
    pinCount: computed(() => pinCount.value),
    placeRequested:  computed(() => placeRequested.value),
    cancelRequested: computed(() => cancelRequested.value),
    exitRequested:   computed(() => exitRequested.value),

    // writers (overlay)
    setActive,
    setMode,
    setPinCount,

    // intents (launcher)
    requestPlace,
    requestCancel,
    requestExit,
  };
}
