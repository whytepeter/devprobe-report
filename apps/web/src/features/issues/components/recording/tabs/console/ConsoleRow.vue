<!--
  ConsoleRow
  ──────────
  Single row in the Console tab. Timestamp on the left, kind icon, summary
  on the right. Error-level rows get a red wash + left accent so they pop
  in a long log.

  Click anywhere in the row → seek the player to this event's timestamp.
-->
<template>
  <button
    type="button"
    :class="[
      'grid w-full grid-cols-[56px_22px_1fr] items-start gap-2 px-3 py-1.5 text-left text-[13px] leading-snug transition-colors',
      isError
        ? 'bg-rose-50/60 hover:bg-rose-100/70 border-l-2 border-l-rose-400 dark:bg-rose-500/10 dark:hover:bg-rose-500/15'
        : 'hover:bg-muted/60',
    ]"
    @click="$emit('seek', event.timestampMs)"
  >
    <span class="font-mono text-[11px] text-muted-foreground tabular-nums">{{ time }}</span>
    <span :class="['mt-px flex h-4 w-4 items-center justify-center', iconColor]">
      <Icon :name="iconName" :size="13" :stroke-width="1.75" />
    </span>
    <span class="min-w-0 break-words" :class="isError ? 'text-rose-700 dark:text-rose-300' : 'text-foreground/90'">
      <!-- Repeat-count badge sits before the summary when present. -->
      <span
        v-if="repeatCount && repeatCount > 1"
        class="mr-1.5 inline-flex items-center rounded bg-rose-500 px-1 py-px text-[10px] font-semibold text-white tabular-nums"
      >
        {{ repeatCount }}×
      </span>
      <slot>{{ event.summary }}</slot>
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Icon } from "@deveprobe/ui";
import type { TimelineEvent } from "@deveprobe/shared";

const props = defineProps<{
  event:        TimelineEvent;
  repeatCount?: number;
}>();

defineEmits<{ seek: [ms: number] }>();

const isError = computed(() => {
  if (props.event.kind === "error") return true;
  if (props.event.kind === "console" && (props.event.data as { level?: string })?.level === "error") return true;
  if (props.event.kind === "network") {
    const status = (props.event.data as { status?: number })?.status ?? 0;
    return status === 0 || status >= 400;
  }
  return false;
});

/** mm:ss formatted timestamp. */
const time = computed(() => {
  const s = Math.max(0, Math.floor(props.event.timestampMs / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
});

const iconName = computed(() => {
  switch (props.event.kind) {
    case "network":     return "globe";
    case "navigation":  return "arrow-right";
    case "user_action": return "arrow-right";
    case "error":       return "alert-circle";
    case "console":     return "circle";
    default:            return "circle";
  }
});

const iconColor = computed(() => {
  if (isError.value) return "text-rose-500";
  switch (props.event.kind) {
    case "network":     return "text-sky-500";
    case "navigation":  return "text-violet-500";
    case "user_action": return "text-violet-500";
    case "console":     return "text-muted-foreground";
    default:            return "text-muted-foreground";
  }
});
</script>
