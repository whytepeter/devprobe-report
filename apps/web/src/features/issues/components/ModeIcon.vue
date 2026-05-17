<template>
  <Icon :name="icon" :size="14" :stroke-width="1.5" :class="cls" />
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Icon } from '@deveprobe/ui';
import type { IssueMode } from "@deveprobe/shared";
const props = defineProps<{ mode: IssueMode }>();

const map: Record<string, { icon: string; cls: string }> = {
  screen_recording: { icon: "video",   cls: "text-violet-400" },
  live_annotation:  { icon: "pin",     cls: "text-fuchsia-400" },
  screenshot:       { icon: "camera",  cls: "text-sky-400" },
  imported:         { icon: "import",  cls: "text-[var(--text-muted)]" },
};

const resolved = computed(() => map[props.mode] ?? map["screenshot"]!);
const icon = computed(() => resolved.value.icon);
const cls  = computed(() => resolved.value.cls);
</script>
