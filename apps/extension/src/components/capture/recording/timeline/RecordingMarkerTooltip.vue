<!--
  RecordingMarkerTooltip
  ──────────────────────
  Dark pill shown above a hovered marker on the recording timeline.

  Edge-aware positioning: the tooltip's horizontal anchor switches based on
  the marker's position within the track so the pill never overflows.
    • leftPct < ~15  → anchor LEFT edge of the tooltip near the marker
    • leftPct > ~85  → anchor RIGHT edge of the tooltip near the marker
    • otherwise      → centred (default)

  The caret slides to follow the marker regardless of anchor mode so the
  arrow always points at the dot.
-->
<template>
  <div
    class="pointer-events-none absolute z-30 select-none"
    :style="containerStyle"
  >
    <div class="relative rounded-lg bg-[#1a1a1a] px-3 py-2 text-[12px] shadow-[0_8px_24px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.06)] max-w-[280px]">
      <span
        class="inline-block rounded-[4px] px-1.5 py-px text-[9px] font-bold uppercase tracking-[0.08em]"
        :class="badgeClass"
      >
        {{ badgeLabel }}
      </span>
      <p
        class="mt-1.5 text-white/90 font-medium overflow-hidden text-ellipsis whitespace-nowrap"
        :title="label"
      >
        {{ truncatedLabel }}
      </p>
      <p class="mt-0.5 text-[11px] text-white/40 whitespace-nowrap">
        {{ time }} <span class="text-white/25">·</span> click to seek
      </p>

      <!-- Caret — slides with the marker so the arrow always points at the dot. -->
      <span
        class="absolute top-full h-2 w-2 -translate-y-1/2 rotate-45 bg-[#1a1a1a]"
        :style="caretStyle"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { MarkerType } from '../types.js';

const props = defineProps<{
  type:    MarkerType;
  label:   string;
  time:    string;        // pre-formatted, e.g. "0:07"
  leftPct: string;        // CSS value, e.g. "55%"
}>();

// Hard cap so URLs / stack traces don't blow out the tooltip width even with
// `max-w` + text-ellipsis (some characters don't trigger overflow reliably).
const MAX_LABEL_CHARS = 80;
const truncatedLabel = computed(() =>
  props.label.length > MAX_LABEL_CHARS
    ? props.label.slice(0, MAX_LABEL_CHARS - 1).trimEnd() + '…'
    : props.label,
);

// ── Edge-aware positioning ─────────────────────────────────────────────────
// Anchor inset (px) at start/end alignments — small offset from the very
// edge so the caret has room to live next to the marker. Two thresholds in
// percent of the track width drive the switch between center/start/end.
const ANCHOR_INSET_PX     = 14;
const START_THRESHOLD_PCT = 15;
const END_THRESHOLD_PCT   = 85;

const pctNumber = computed(() => parseFloat(props.leftPct) || 0);

const align = computed<'start' | 'center' | 'end'>(() => {
  const n = pctNumber.value;
  if (n < START_THRESHOLD_PCT) return 'start';
  if (n > END_THRESHOLD_PCT)   return 'end';
  return 'center';
});

const containerStyle = computed<Record<string, string>>(() => {
  const base = { left: props.leftPct, bottom: 'calc(100% + 8px)' };
  switch (align.value) {
    case 'start':
      // Left edge of tooltip sits a few px to the left of the marker.
      return { ...base, transform: `translateX(-${ANCHOR_INSET_PX}px)` };
    case 'end':
      // Right edge of tooltip sits a few px to the right of the marker.
      return { ...base, transform: `translateX(calc(-100% + ${ANCHOR_INSET_PX}px))` };
    default:
      return { ...base, transform: 'translateX(-50%)' };
  }
});

// Caret offset matches the anchor inset so the diamond points at the marker.
const caretStyle = computed<Record<string, string>>(() => {
  switch (align.value) {
    case 'start': return { left:  `${ANCHOR_INSET_PX}px` };
    case 'end':   return { right: `${ANCHOR_INSET_PX}px` };
    default:      return { left:  '50%', marginLeft: '-4px' }; // half of w-2 (8px)
  }
});

// ── Visual identity ─────────────────────────────────────────────────────────
const badgeLabel = computed(() => {
  switch (props.type) {
    case 'network_fail': return 'Network';
    case 'network_slow': return 'Network';
    case 'error':        return 'Error';
    case 'warning':      return 'Warning';
    case 'navigation':   return 'Nav';
    case 'user_action':  return 'Action';
    case 'marker':       return 'Marker';
  }
});

const badgeClass = computed(() => {
  switch (props.type) {
    case 'network_fail':
    case 'error':         return 'bg-red-500/15 text-red-300';
    case 'network_slow':  return 'bg-orange-500/15 text-orange-300';
    case 'warning':       return 'bg-amber-500/15 text-amber-300';
    case 'navigation':    return 'bg-sky-500/15 text-sky-300';
    case 'user_action':   return 'bg-white/10 text-white/70';
    case 'marker':        return 'bg-violet-500/20 text-violet-300';
  }
});
</script>
