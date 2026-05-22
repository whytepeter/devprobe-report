<!-- HTTP status + method badge used in the Network tab of IssueTimeline -->
<template>
  <span class="inline-flex items-center gap-1 font-mono text-[10px] leading-none">
    <span class="rounded px-1 py-0.5 font-medium" :class="methodCls">{{ method }}</span>
    <span class="rounded px-1 py-0.5" :class="statusCls">{{ status || '—' }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ data: Record<string, unknown> }>();

const method = computed(() => String(props.data?.method ?? "GET").toUpperCase());
const status = computed(() => Number(props.data?.status ?? 0));

const methodCls = computed(() => "bg-muted text-muted-foreground");

const statusCls = computed(() => {
  const s = status.value;
  if (s >= 500) return "bg-destructive/15 text-destructive";
  if (s >= 400) return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
  if (s >= 200 && s < 300) return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
  return "bg-muted text-muted-foreground";
});
</script>
