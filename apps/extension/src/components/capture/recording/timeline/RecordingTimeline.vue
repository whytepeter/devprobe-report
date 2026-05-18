<!--
  RecordingTimeline
  ─────────────────
  Trimmer at the bottom of the recording panel (light theme).

  Visuals:
  - Track: light muted bg
  - Outside trim region: bars dimmed to a soft neutral
  - Inside trim region:  bars in violet
  - Two violet trim handles at trimStart and trimEnd, draggable
  - Coloured event markers sit on the waveform; hover shows tooltip
  - Playhead is a dark vertical line for contrast on the light bg
-->
<template>
  <!-- Bordered card wrapper to match the design -->
  <div class="mx-4 mb-3 rounded-lg border border-border bg-muted/30 px-2 py-1.5">
    <div
      ref="rootEl"
      class="relative h-[28px] cursor-pointer select-none"
      @mousedown="onMouseDown"
      @click="onTrackClick"
    >
      <!-- Waveform bars -->
      <div class="absolute inset-0 flex items-end gap-[1.5px]">
        <div
          v-for="(bar, i) in waveformBars"
          :key="i"
          class="rounded-[1.5px]"
          :style="{
            flex: '1 0 0',
            minWidth: '2px',
            height: bar + '%',
            background: barColor(i / waveformBars.length),
            transition: 'background 80ms',
          }"
        />
      </div>

      <!-- Event markers -->
      <div
        v-for="marker in markers"
        :key="marker.id"
        class="absolute top-1/2 z-10 -translate-y-1/2 -translate-x-1/2 h-2 w-2 cursor-pointer rounded-full border-[1.5px] border-card transition-transform hover:scale-125"
        :class="markerBg(marker.type)"
        :style="{ left: markerLeftPct(marker.timestampMs) }"
        @mouseenter="hoveredMarkerId = marker.id"
        @mouseleave="hoveredMarkerId = null"
        @click.stop="emit('seek-to-ms', marker.timestampMs)"
      />

      <!-- Trim handles -->
      <div
        class="absolute -top-1 -bottom-1 z-20 w-[5px] -translate-x-1/2 cursor-ew-resize rounded-[2px] bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.35)]"
        :style="{ left: trimStartPct }"
        @mousedown.stop="onTrimMouseDown('start', $event)"
      >
        <span class="absolute inset-y-1 left-1/2 w-px -translate-x-1/2 bg-white/60" />
      </div>
      <div
        class="absolute -top-1 -bottom-1 z-20 w-[5px] -translate-x-1/2 cursor-ew-resize rounded-[2px] bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.35)]"
        :style="{ left: trimEndPct }"
        @mousedown.stop="onTrimMouseDown('end', $event)"
      >
        <span class="absolute inset-y-1 left-1/2 w-px -translate-x-1/2 bg-white/60" />
      </div>

      <!-- Playhead: vertical line + grabbable knob on top -->
      <div
        class="absolute -top-2 -bottom-2 z-30 -translate-x-1/2 cursor-grab active:cursor-grabbing"
        :style="{ left: (progress * 100) + '%' }"
        @mousedown.stop="onPlayheadMouseDown"
      >
        <!-- Knob (top) -->
        <span class="absolute -top-1 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-foreground shadow-[0_0_0_2px_rgba(255,255,255,0.85)]" />
        <!-- Stem -->
        <span class="absolute top-2 bottom-0 left-1/2 w-[1.5px] -translate-x-1/2 bg-foreground" />
      </div>

      <!-- Marker tooltip -->
      <RecordingMarkerTooltip
        v-if="hoveredMarker"
        :type="hoveredMarker.type"
        :label="hoveredMarker.label || defaultLabel(hoveredMarker.type)"
        :time="formatShort(hoveredMarker.timestampMs)"
        :left-pct="markerLeftPct(hoveredMarker.timestampMs)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import RecordingMarkerTooltip from './RecordingMarkerTooltip.vue';
import type { RecordingMarker, MarkerType } from '../types.js';

const props = defineProps<{
  progress:    number;
  durationMs:  number;
  markers:     RecordingMarker[];
  trimStartMs: number;
  trimEndMs:   number;
}>();

const emit = defineEmits<{
  seek:                [pct: number];
  'seek-to-ms':        [ms: number];
  'update:trim-start': [ms: number];
  'update:trim-end':   [ms: number];
}>();

const rootEl          = ref<HTMLDivElement | null>(null);
const isScrubbing     = ref(false);
const hoveredMarkerId = ref<string | null>(null);

// ── Waveform (deterministic) ───────────────────────────────────────────────
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

// ── Trim positions ─────────────────────────────────────────────────────────
const trimStartPct = computed(() =>
  props.durationMs > 0
    ? Math.min(100, (props.trimStartMs / props.durationMs) * 100) + '%'
    : '0%',
);
const trimEndPct = computed(() =>
  props.durationMs > 0
    ? Math.min(100, (props.trimEndMs / props.durationMs) * 100) + '%'
    : '100%',
);

function barColor(pct: number): string {
  const startPct = props.durationMs > 0 ? props.trimStartMs / props.durationMs : 0;
  const endPct   = props.durationMs > 0 ? props.trimEndMs   / props.durationMs : 1;
  // Solid colour + opacity reads well on both light and dark backgrounds.
  if (pct < startPct || pct > endPct) {
    return 'rgba(168,162,158,0.18)';  // muted (outside trim)
  }
  return 'rgba(139,92,246,0.85)';     // violet (inside trim)
}

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
    default:             return 'bg-muted-foreground';
  }
}

function defaultLabel(type: MarkerType): string {
  switch (type) {
    case 'error':        return 'JavaScript error';
    case 'warning':      return 'Warning';
    case 'network_fail': return 'Network failure';
    case 'network_slow': return 'Slow network request';
    case 'navigation':   return 'Navigation';
    case 'user_action':  return 'User action';
    case 'marker':       return 'Marker';
  }
}

function formatShort(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const hoveredMarker = computed(() =>
  props.markers.find((m) => m.id === hoveredMarkerId.value) ?? null,
);

// ── Scrub interactions ─────────────────────────────────────────────────────
function pctAt(e: MouseEvent): number {
  if (!rootEl.value) return 0;
  const rect = rootEl.value.getBoundingClientRect();
  return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
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

// ── Playhead knob drag ─────────────────────────────────────────────────────
// Reuses the track scrub logic but starts from the playhead's current
// position so the cursor doesn't jump on grab.
function onPlayheadMouseDown(e: MouseEvent) {
  e.preventDefault();
  isScrubbing.value = true;

  const onMove = (ev: MouseEvent) => emit('seek', pctAt(ev));
  const onUp   = () => {
    isScrubbing.value = false;
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

// ── Trim handle drag ───────────────────────────────────────────────────────
function onTrimMouseDown(which: 'start' | 'end', e: MouseEvent) {
  e.preventDefault();

  const onMove = (ev: MouseEvent) => {
    const ms = pctAt(ev) * props.durationMs;
    if (which === 'start') {
      const next = Math.max(0, Math.min(props.trimEndMs - 100, ms));
      emit('update:trim-start', Math.round(next));
    } else {
      const next = Math.min(props.durationMs, Math.max(props.trimStartMs + 100, ms));
      emit('update:trim-end', Math.round(next));
    }
  };
  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}
</script>
