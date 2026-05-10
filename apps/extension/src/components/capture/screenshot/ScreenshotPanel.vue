<!--
  ScreenshotPanel
  ───────────────
  Left panel: screenshot canvas + annotation toolbar.

  Toolbar is rendered HERE (not via a canvas slot) so it can be centered on
  the full panel width — guaranteed centred regardless of screenshot aspect.
-->
<template>
  <div
    class="relative flex h-full w-full flex-col overflow-hidden rounded-xl bg-[#f0f0ee]"
  >
    <!-- Dot-grid texture -->
    <div
      class="pointer-events-none absolute inset-0 opacity-[0.35]"
      style="
        background-image: radial-gradient(circle, #b0b0b0 1px, transparent 1px);
        background-size: 20px 20px;
      "
    />

    <!-- Canvas fills remaining space -->
    <AnnotationCanvas
      ref="canvasRef"
      class="flex-1 min-h-0"
      :screenshot-data-url="screenshotDataUrl"
      :tool="activeTool"
      :color="activeColor"
      @history-change="onHistoryChange"
      @selection-change="onSelectionChange"
    />

    <!-- Toolbar bar — full-width flex container centred via justify-center.
         More reliable than translate-based centring inside shadow DOM. -->
    <div
      class="absolute inset-x-0 bottom-5 z-10 flex justify-center pointer-events-none"
    >
      <div class="pointer-events-auto whitespace-nowrap">
        <AnnotationToolbar
          v-model:tool="activeTool"
          v-model:color="activeColor"
          :can-undo="canUndo"
          :can-redo="canRedo"
          :has-selection="hasSelection"
          @undo="canvasRef?.undo()"
          @redo="canvasRef?.redo()"
          @delete="canvasRef?.deleteSelected()"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import AnnotationCanvas from "./annotation/AnnotationCanvas.vue";
import AnnotationToolbar from "./annotation/AnnotationToolbar.vue";
import type { DrawTool } from "./annotation/types.js";

defineProps<{ screenshotDataUrl: string }>();

const canvasRef = ref<InstanceType<typeof AnnotationCanvas> | null>(null);
const activeTool = ref<DrawTool>("pen");
const activeColor = ref("#7c3aed");

const canUndo = ref(false);
const canRedo = ref(false);
const hasSelection = ref(false);

function onHistoryChange(u: boolean, r: boolean) {
  canUndo.value = u;
  canRedo.value = r;
}
function onSelectionChange(v: boolean) {
  hasSelection.value = v;
}

function exportPng(): string {
  return canvasRef.value?.exportPng() ?? "";
}

defineExpose({ exportPng });
</script>
