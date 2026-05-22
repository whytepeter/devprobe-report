<!--
  TimelineRow
  ───────────
  A single row in the timeline panel. Shows:
  - Timestamp chip (mm:ss) — clickable to seek video if seekTo is provided
  - Optional badge slot (console level, network status, severity pill)
  - Summary text (truncated to one line, full text in title)
-->
<template>
  <div class="flex items-start gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors min-w-0">
    <!-- Timestamp chip — seeks video on click -->
    <button
      v-if="seekTo"
      class="flex-shrink-0 mt-0.5 font-mono text-[11px] tabular-nums rounded px-1.5 py-0.5
             bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary
             transition-colors cursor-pointer"
      :title="`Seek to ${formatMs(event.timestampMs)}`"
      @click="seekTo(event.timestampMs)"
    >
      {{ formatMs(event.timestampMs) }}
    </button>
    <span
      v-else
      class="flex-shrink-0 mt-0.5 font-mono text-[11px] tabular-nums rounded px-1.5 py-0.5
             bg-muted text-muted-foreground"
    >
      {{ formatMs(event.timestampMs) }}
    </span>

    <!-- Badge slot (console level, network status, etc.) -->
    <span class="flex-shrink-0 mt-0.5">
      <slot name="badge" />
    </span>

    <!-- Summary -->
    <p
      class="flex-1 min-w-0 text-[12px] leading-5 text-foreground/80 truncate"
      :title="event.summary"
    >
      {{ event.summary }}
    </p>
  </div>
</template>

<script setup lang="ts">
import type { TimelineEvent } from "@deveprobe/shared";

defineProps<{
  event:   TimelineEvent;
  seekTo?: (ms: number) => void;
}>();

function formatMs(ms: number): string {
  const totalSec = Math.floor(Math.max(0, ms) / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
</script>
