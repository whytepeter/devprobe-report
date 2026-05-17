<!--
  TypeChip
  ────────
  Capture-mode pill used on issue cards and the issue detail hero.
  Maps an IssueMode to icon + label + warm pastel colour.
-->
<template>
  <span
    :class="[
      'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider',
      tone,
    ]"
  >
    <Icon :name="icon" :size="11" :stroke-width="2" />
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Icon } from "@deveprobe/ui";
import type { IssueMode } from "@deveprobe/shared";

const props = defineProps<{ mode: IssueMode }>();

const MAP: Record<IssueMode, { label: string; icon: string; tone: string }> = {
  screenshot: {
    label: "Screenshot",
    icon: "monitor",
    tone: "bg-sky-100/80 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  },
  screen_recording: {
    label: "Recording",
    icon: "video",
    tone: "bg-violet-100/80 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300",
  },
  live_annotation: {
    label: "Pin",
    icon: "map-pin",
    tone: "bg-amber-100/80 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  },
  imported: {
    label: "Imported",
    icon: "file-input",
    tone: "bg-neutral-100 text-neutral-700 dark:bg-neutral-700/40 dark:text-neutral-300",
  },
};

const label = computed(() => MAP[props.mode].label);
const icon = computed(() => MAP[props.mode].icon);
const tone = computed(() => MAP[props.mode].tone);
</script>
