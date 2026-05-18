<!--
  RecordingTimeline
  ─────────────────
  Waveform scrubber with event markers and a draggable playhead.

  Owns:
  - Deterministic waveform bar generation (no audio data needed)
  - Marker colour mapping
  - Click and drag-scrub logic (captures document mousemove/mouseup)

  Emits:
  - seek(pct)      — user seeks to a fractional position (0–1)
  - seek-to-ms(ms) — user clicks a marker directly
-->
<template>
  <div
    ref="rootEl"
    class="relative mx-3 mt-3 mb-1.5 h-[52px] cursor-pointer rounded-md overflow-hidden select-none"
    @mousedown="onMouseDown"
    @click="onTrackClick"
  >
    <!-- Waveform bars -->
    <div class="absolute inset-0 flex items-end gap-[2px] px-1 pb-1">
      <div
        v-for="(bar, i) in waveformBars"
        :key="i"
        class="rounded-[2px]"
        :style="{
          flex: '1 0 0',
          minWidth: '2px',
          height: bar + '%',
          background: i / waveformBars.length <= progress
            ? 'rgba(139,92,246,0.85)'
            : 'rgba(255,255,255,0.12)',
          transition: 'background 80ms',
        }"
      />
    </div>

    <!-- Event markers -->
    <div
      v-for="marker in markers"
      :key="marker.id"
      class="absolute top-1/2 z-10 -translate-y-1/2 -translate-x-1/2 h-2.5 w-2.5 cursor-pointer rounded-full border-[1.5px] border-[#111] transition-transform hover:scale-125"
      :class="markerBg(marker.type)"
      :style="{ left: markerLeftPct(marker.timestampMs) }"
      :title="marker.label"
      @click.stop="emit('seek-to-ms', marker.timestampMs)"
    />

    <!-- Playhead -->
    <div
      class="pointer-events-none absolute top-0 bottom-0 z-20 w-[2px] -translate-x-px bg-white shadow-[0_0_6px_rgba(255,255,255,0.45)]"
      :style="{ left: (progress * 100) + '%' }"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { RecordingMarker, MarkerType } from './types.js';

const props = defineProps<{
  progress:  number;      // 0–1 playhead position
  durationMs: number;
  markers:   RecordingMarker[];
}>();

const emit = defineEmits<{
  seek:       [pct: number];
  'seek-to-ms': [ms: number];
}>();

const rootEl     = ref<HTMLDivElement | null>(null);
const isScrubbing = ref(false);

// ── Waveform ───────────────────────────────────────────────────────────────
// 80 bars from superimposed sine waves — deterministic, no audio data needed.
const waveformBars = computed<number[]>(() =>
  Array.from({ length: 80 }, (_, i) => {
    const v =
      Math.abs(
        Math.sin(i * 0.31) * 38 +
        Math.sin(i * 0.72) * 22 +
        Math.sin(i * 1.37) * 12,
      ) + 12;
    return Math.min(95, Math.max(8, v));
  }),
);

// ── Marker helpers ─────────────────────────────────────────────────────────
function markerLeftPct(ms: number): string {
  if (props.durationMs <= 0) return '0%';
  return (Math.min(1, ms / props.durationMs) * 100) + '%';
}

function markerBg(type: MarkerType): string {
  switch (type) {
    case 'error':        return 'bg-red-500';
    case 'warning':      return 'bg-amber-400';
    case 'network_fail': return 'bg-red-400';
    case 'network_slow': return 'bg-orange-400';
    case 'navigation':   return 'bg-sky-400';
    case 'marker':       return 'bg-violet-400';
    default:             return 'bg-white/60';
  }
}

// ── Scrub interactions ─────────────────────────────────────────────────────
function pctAt(e: MouseEvent): number {
  if (!rootEl.value) return 0;
  const rect = rootEl.value.getBoundingClientRect();
  return (e.clientX - rect.left) / rect.width;
}

function onTrackClick(e: MouseEvent) {
  if (!isScrubbing.value) emit('seek', pctAt(e));
}

function onMouseDown(e: MouseEvent) {
  isScrubbing.value = true;
  emit('seek', pctAt(e));

  const onMove = (ev: MouseEvent) => emit('seek', pctAt(ev));
  const onUp   = () => {
    isScrubbing.value = false;
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}
</script>
