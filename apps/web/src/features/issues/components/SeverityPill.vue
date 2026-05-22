<!-- Severity pill used in the Errors tab of IssueTimeline -->
<template>
  <span v-if="severity" class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium leading-none" :class="cls">
    {{ severity }}
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Severity } from "@deveprobe/shared";

const props = defineProps<{ severity: Severity | null }>();

const cls = computed(() => {
  switch (props.severity) {
    case "critical": return "bg-destructive/20 text-destructive";
    case "high":     return "bg-destructive/15 text-destructive";
    case "medium":   return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
    case "low":      return "bg-muted text-muted-foreground";
    default:         return "bg-muted text-muted-foreground";
  }
});
</script>
