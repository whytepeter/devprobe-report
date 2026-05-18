<!--
  RecordingMarkerTooltip
  ──────────────────────
  Dark pill shown above a hovered marker on the recording timeline.

  ┌──────────────────────────────────┐
  │  [Network]                       │
  │  POST /api/v2/workspace · 500    │
  │  0:07 · click to seek            │
  └──────────────╲▼╱─────────────────┘
-->
<template>
  <div
    class="pointer-events-none absolute z-30 -translate-x-1/2 select-none"
    :style="{ left: leftPct, bottom: 'calc(100% + 8px)' }"
  >
    <div class="relative rounded-lg bg-[#1a1a1a] px-3 py-2 text-[12px] shadow-[0_8px_24px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.06)] whitespace-nowrap">
      <span
        class="inline-block rounded-[4px] px-1.5 py-px text-[9px] font-bold uppercase tracking-[0.08em]"
        :class="badgeClass"
      >
        {{ badgeLabel }}
      </span>
      <p class="mt-1.5 text-white/90 font-medium">{{ label }}</p>
      <p class="mt-0.5 text-[11px] text-white/40">
        {{ time }} <span class="text-white/25">·</span> click to seek
      </p>

      <!-- Caret -->
      <span class="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[#1a1a1a]" />
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
