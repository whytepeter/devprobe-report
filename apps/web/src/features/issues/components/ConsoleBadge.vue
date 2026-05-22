<!-- Console level badge used in the Console tab of IssueTimeline -->
<template>
  <span class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono font-medium leading-none" :class="cls">
    {{ level }}
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ level: string }>();

const cls = computed(() => {
  switch (props.level) {
    case "error":   return "bg-destructive/15 text-destructive";
    case "warn":    return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
    case "info":    return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "debug":   return "bg-muted text-muted-foreground";
    default:        return "bg-muted text-muted-foreground"; // log
  }
});
</script>
