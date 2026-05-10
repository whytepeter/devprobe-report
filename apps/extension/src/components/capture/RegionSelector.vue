<!--
  RegionSelector
  ──────────────
  Full-page crosshair overlay. User drags a rectangle over the capture area.

  Brightness fix:
    Before selection: base overlay dims the page (rgba 0,0,0,0.45).
    During selection: base overlay goes transparent; the selection's CSS outline
    creates the dark mask OUTSIDE the box only — inside is 100% clear.

  Emits:
    selected(bounds: RegionBounds)  — confirmed region in CSS pixels
    cancel()                        — ESC pressed
-->
<template>
  <div
    ref="overlay"
    class="fixed inset-0 z-[2147483647] cursor-crosshair select-none outline-none pointer-events-auto
           transition-colors duration-100"
    :style="{ background: box ? 'transparent' : 'rgba(0,0,0,0.45)' }"
    @mousedown.prevent="onMousedown"
    @mousemove="onMousemove"
    @mouseup="onMouseup"
    @keydown.esc.prevent="emit('cancel')"
    tabindex="-1"
  >
    <!-- Selection box — outline-mask dims everything OUTSIDE the selection -->
    <div
      v-if="box"
      class="absolute box-border"
      :style="{
        left:    box.x + 'px',
        top:     box.y + 'px',
        width:   box.w + 'px',
        height:  box.h + 'px',
        outline: '9999px solid rgba(0,0,0,0.62)',
        border:  '2px solid rgba(124,58,237,0.9)',
      }"
    >
      <!-- Corner handles -->
      <span class="absolute -top-1 -left-1    h-2.5 w-2.5 rounded-sm border-2 border-[#7c3aed] bg-white"/>
      <span class="absolute -top-1 -right-1   h-2.5 w-2.5 rounded-sm border-2 border-[#7c3aed] bg-white"/>
      <span class="absolute -bottom-1 -left-1  h-2.5 w-2.5 rounded-sm border-2 border-[#7c3aed] bg-white"/>
      <span class="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-sm border-2 border-[#7c3aed] bg-white"/>

      <!-- Dimensions badge -->
      <span
        class="absolute left-1/2 -translate-x-1/2 pointer-events-none whitespace-nowrap
               rounded-md px-2 py-1 text-[11px] font-semibold leading-none text-white
               tracking-wide"
        style="bottom: calc(100% + 8px); background: rgba(0,0,0,0.78)"
      >
        {{ Math.round(box.w) }} × {{ Math.round(box.h) }}
      </span>
    </div>

    <!-- Instruction hint (before dragging) -->
    <div v-else class="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div
        class="flex items-center gap-2.5 rounded-xl px-5 py-3
               text-[13px] font-medium text-white"
        style="background: rgba(0,0,0,0.70); backdrop-filter: blur(8px);
               border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 8px 32px rgba(0,0,0,0.3)"
      >
        <svg class="h-4 w-4 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/>
          <rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
        <span>Drag to select a region</span>
        <kbd class="rounded-md bg-white/[0.12] px-1.5 py-0.5 text-[10px] font-medium font-mono">ESC</kbd>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

export interface RegionBounds { x: number; y: number; w: number; h: number }

const emit = defineEmits<{
  selected: [bounds: RegionBounds];
  cancel: [];
}>();

type DragState = 'idle' | 'dragging';

const overlay = ref<HTMLDivElement | null>(null);
const state   = ref<DragState>('idle');
const origin  = ref<{ x: number; y: number } | null>(null);
const box     = ref<RegionBounds | null>(null);

onMounted(() => overlay.value?.focus());

function normalise(ax: number, ay: number, bx: number, by: number): RegionBounds {
  return { x: Math.min(ax, bx), y: Math.min(ay, by), w: Math.abs(bx - ax), h: Math.abs(by - ay) };
}

function onMousedown(e: MouseEvent) {
  if (e.button !== 0) return;
  state.value  = 'dragging';
  origin.value = { x: e.clientX, y: e.clientY };
  box.value    = null;
}

function onMousemove(e: MouseEvent) {
  if (state.value !== 'dragging' || !origin.value) return;
  box.value = normalise(origin.value.x, origin.value.y, e.clientX, e.clientY);
}

function onMouseup(e: MouseEvent) {
  if (state.value !== 'dragging' || !origin.value) return;
  const final = normalise(origin.value.x, origin.value.y, e.clientX, e.clientY);
  state.value  = 'idle';
  origin.value = null;
  if (final.w < 10 || final.h < 10) { box.value = null; return; }
  emit('selected', final);
}
</script>
