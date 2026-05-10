<!--
  AnnotationCanvas
  ────────────────
  Provides the <canvas> node + wires drawing events.
  All drawing state lives in useAnnotationCanvas composable.

  Layout:
    outer  — fills parent, adds padding around canvas, reserves toolbar space
    inner  — sized exactly to display dimensions of the canvas (1:1 aspect)
    canvas — fills inner, rounded + shadow
    text-overlay — absolute HTML <textarea> shown when text-tool clicks
    #below slot   — toolbar, positioned under the canvas

  Emits 'history-change' whenever undo/redo availability changes.
  Exposed: exportPng(), undo(), redo()
-->
<template>
  <!-- outer: fills parent, centres inner, padding gives screenshot breathing space -->
  <div
    ref="outer"
    class="flex h-full w-full items-center justify-center px-10 pt-10 pb-[88px]"
  >
    <!-- inner: exactly bitmap-scaled — toolbar + text overlay positioned relative to this -->
    <div
      ref="inner"
      class="relative flex-shrink-0"
      :style="{ width: displayW, height: displayH }"
    >
      <!-- Canvas with rounded corners and shadow -->
      <div
        class="w-full h-full rounded-xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.14),0_0_0_1px_rgba(0,0,0,0.07)]"
      >
        <canvas
          ref="canvas"
          class="block w-full h-full"
          :style="{ cursor: cursorForTool }"
          @mousedown.prevent="onMousedown"
          @mousemove="onMousemove"
          @mouseup="onMouseup"
          @mouseleave="onMouseleave"
        />
      </div>

      <!-- Text-tool input overlay — absolute, positioned at canvas-space click -->
      <div
        v-if="pendingText"
        class="absolute z-20"
        :style="{
          left: `${pendingText.canvasX * scale}px`,
          top: `${pendingText.canvasY * scale}px`,
        }"
      >
        <textarea
          ref="textArea"
          v-model="textValue"
          rows="1"
          class="bg-white/95 backdrop-blur-sm border border-primary overflow-hidden rounded px-2 py-1 outline-none resize-none shadow-[0_4px_16px_rgba(124,58,237,0.25)] font-semibold leading-tight"
          :style="{
            color,
            fontSize: `${textFontPx}px`,
            minWidth: '120px',
            minHeight: `${textFontPx * 1.4}px`,
          }"
          placeholder="Type…"
          @keydown.enter.exact.prevent="onTextSubmit"
          @keydown.escape.prevent="onTextCancel"
          @blur="onTextSubmit"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  toRef,
  nextTick,
  onMounted,
  onUnmounted,
} from "vue";
import { useAnnotationCanvas } from "./useAnnotationCanvas.js";
import type { DrawTool } from "./types.js";

const props = defineProps<{
  screenshotDataUrl: string;
  tool: DrawTool;
  color: string;
}>();

const emit = defineEmits<{
  "history-change": [canUndo: boolean, canRedo: boolean];
  "selection-change": [hasSelection: boolean];
}>();

// ── Refs ──────────────────────────────────────────────────────────────────────
const outer = ref<HTMLDivElement | null>(null);
const inner = ref<HTMLDivElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const textArea = ref<HTMLTextAreaElement | null>(null);
const outerW = ref(0);
const outerH = ref(0);

// Padding values (must match Tailwind classes on outer)
const PAD_X = 32 * 2; // px-8 each side
const PAD_TOP = 32; // pt-8
const PAD_BOTTOM = 80; // pb-[80px] (toolbar room)

// ── ResizeObserver — tracks available space ──────────────────────────────────
let ro: ResizeObserver | null = null;

onMounted(() => {
  const el = outer.value;
  if (!el) return;
  ro = new ResizeObserver(([entry]) => {
    // contentRect already excludes the outer's padding — use directly
    outerW.value = entry.contentRect.width;
    outerH.value = entry.contentRect.height;
  });
  ro.observe(el);
});
onUnmounted(() => ro?.disconnect());

// ── Composable ────────────────────────────────────────────────────────────────
const {
  bitmapW,
  bitmapH,
  canUndo,
  canRedo,
  hasSelection,
  cursorForTool,
  pendingText,
  onMousedown,
  onMousemove,
  onMouseup,
  onMouseleave,
  commitText,
  cancelText,
  deleteSelected,
  exportPng: _exportPng,
  undo,
  redo,
} = useAnnotationCanvas({
  canvas,
  screenshotDataUrl: toRef(props, "screenshotDataUrl"),
  tool: toRef(props, "tool"),
  color: toRef(props, "color"),
});

watch([canUndo, canRedo], ([u, r]) => emit("history-change", u, r), {
  immediate: true,
});
watch(hasSelection, (v) => emit("selection-change", v), { immediate: true });

// ── Display sizing ────────────────────────────────────────────────────────────
const scale = computed((): number => {
  if (!outerW.value || !bitmapW.value || !bitmapH.value) return 1;
  return Math.min(outerW.value / bitmapW.value, outerH.value / bitmapH.value);
});

const displayW = computed((): string => {
  if (!outerW.value || !bitmapW.value || !bitmapH.value) return "100%";
  return `${Math.floor(bitmapW.value * scale.value)}px`;
});

const displayH = computed((): string => {
  if (!outerH.value || !bitmapW.value || !bitmapH.value) return "100%";
  return `${Math.floor(bitmapH.value * scale.value)}px`;
});

// Suppress unused — just here to document the pad constants pair to the template
void PAD_X;
void PAD_TOP;
void PAD_BOTTOM;

// ── Text overlay ──────────────────────────────────────────────────────────────
const textValue = ref("");
const textFontPx = computed(() =>
  Math.max(14, Math.round(20 * scale.value * (window.devicePixelRatio || 1)))
);

watch(pendingText, async (pos) => {
  if (pos) {
    textValue.value = "";
    await nextTick();
    textArea.value?.focus();
  }
});

function onTextSubmit() {
  if (!pendingText.value) return;
  commitText(textValue.value);
  textValue.value = "";
}
function onTextCancel() {
  cancelText();
  textValue.value = "";
}

// ── Public API ────────────────────────────────────────────────────────────────
function exportPng() {
  return _exportPng(props.screenshotDataUrl);
}

defineExpose({ exportPng, undo, redo, deleteSelected });
</script>
