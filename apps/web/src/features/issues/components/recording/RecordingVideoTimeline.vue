<!--
  RecordingVideoTimeline
  ──────────────────────
  Slim linear progress bar that sits ABOVE the play controls.

      ──────────●─────────────●────────────────●────────
      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░
                                    ↑ playhead
      ▓ filled  ░ unfilled  ● error marker (clickable)

  Markers are derived from the events stream (console.error + network 4xx/5xx /
  errors) so the user can jump straight to the moment something broke.

  Interactions:
    • Click the bar → seek to that fraction (emit `seek`)
    • Click a marker → seek to that timestamp (emit `seek-to-ms`)
    • Hover a marker → show summary in a tooltip
-->
<template>
  <div
    ref="rootEl"
    class="group relative h-1.5 cursor-pointer select-none"
    @mousedown="onMouseDown"
    @click="onTrackClick"
  >
    <!-- Track + fill -->
    <div class="absolute inset-y-0 inset-x-0 rounded-full bg-white/15" />
    <div
      class="absolute inset-y-0 left-0 rounded-full bg-violet-500"
      :style="{ width: progressPct }"
    />

    <!-- Error markers — one dot per signal event -->
    <button
      v-for="marker in markers"
      :key="marker.id"
      type="button"
      :aria-label="marker.label"
      :title="marker.label"
      :class="[
        'absolute top-1/2 z-10 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/30 transition-transform hover:scale-125',
        marker.type === 'error' ? 'bg-rose-500' : 'bg-amber-400',
      ]"
      :style="{ left: markerLeft(marker.timestampMs) }"
      @click.stop="emit('seek-to-ms', marker.timestampMs)"
    />

    <!-- Playhead knob — appears on hover, always present for the screen reader -->
    <div
      class="absolute top-1/2 z-20 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_2px_rgba(124,58,237,0.4)] opacity-0 group-hover:opacity-100 transition-opacity"
      :style="{ left: progressPct }"
      aria-hidden="true"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

export interface VideoMarker {
  id:          string;
  timestampMs: number;
  type:        'error' | 'warning';
  label:       string;
}

const props = defineProps<{
  /** 0..1 — playback progress. */
  progress:   number;
  /** Total duration in ms; required to position markers correctly. */
  durationMs: number;
  /** Signal events to dot onto the bar. */
  markers:    VideoMarker[];
}>();

const emit = defineEmits<{
  /** Track scrub — fractional position (0..1). */
  seek:         [pct: number];
  /** Marker click — absolute milliseconds. */
  'seek-to-ms': [ms: number];
}>();

const rootEl       = ref<HTMLDivElement | null>(null);
const isScrubbing  = ref(false);

const progressPct = computed(() =>
  (Math.max(0, Math.min(1, props.progress)) * 100).toFixed(3) + '%',
);

function markerLeft(ms: number): string {
  if (props.durationMs <= 0) return '0%';
  return (Math.min(1, ms / props.durationMs) * 100).toFixed(3) + '%';
}

// ── Scrub interactions ──────────────────────────────────────────────────────
function pctAt(e: MouseEvent): number {
  if (!rootEl.value) return 0;
  const rect = rootEl.value.getBoundingClientRect();
  return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
}

function onTrackClick(e: MouseEvent) {
  // Suppress the click that fires at the end of a drag — `seek` already
  // emitted on mousemove.
  if (!isScrubbing.value) emit('seek', pctAt(e));
}

function onMouseDown(e: MouseEvent) {
  isScrubbing.value = true;
  emit('seek', pctAt(e));
  const onMove = (ev: MouseEvent) => emit('seek', pctAt(ev));
  const onUp   = () => {
    isScrubbing.value = false;
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup',   onUp);
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup',   onUp);
}
</script>
