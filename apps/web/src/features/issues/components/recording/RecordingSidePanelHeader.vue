<!--
  RecordingSidePanelHeader
  ────────────────────────
  Top strip of the recording side panel:
    LEFT   — probe wordmark + monospaced session range pill (e.g. SESSION · 0:00 → 2:03)
    RIGHT  — link/share + overflow icons (UI scaffold; emits for the parent)

  Kept dumb on purpose — accepts a `durationMs` and renders a formatted range,
  emits "share" and "menu" for the parent (real wiring lands later).
-->
<template>
  <div class="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
    <div class="flex items-center gap-3 min-w-0">
      <span class="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <span class="flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Icon name="square" :size="14" :stroke-width="2.5" />
        </span>
        probe<span class="text-primary">.</span>
      </span>
      <span class="rounded-md bg-muted px-2 py-1 font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
        Session · {{ formatRange(durationMs) }}
      </span>
    </div>

    <div class="flex items-center gap-1 text-muted-foreground">
      <button
        type="button"
        class="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted hover:text-foreground transition-colors"
        aria-label="Copy link"
        @click="emit('share')"
      >
        <Icon name="link" :size="13" :stroke-width="2" />
      </button>
      <button
        type="button"
        class="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted hover:text-foreground transition-colors"
        aria-label="More"
        @click="emit('menu')"
      >
        <Icon name="more-horizontal" :size="14" :stroke-width="2" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from "@deveprobe/ui";

defineProps<{ durationMs: number }>();
const emit = defineEmits<{ share: []; menu: [] }>();

/** Renders "0:00 → 2:03" from a recording duration. */
function formatRange(ms: number): string {
  const fmt = (n: number) => {
    const s = Math.max(0, Math.floor(n / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
  return `${fmt(0)} → ${fmt(ms)}`;
}
</script>
