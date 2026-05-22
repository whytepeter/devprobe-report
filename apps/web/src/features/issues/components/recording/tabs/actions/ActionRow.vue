<!--
  ActionRow
  ─────────
  Single row in the Actions tab. Renders timestamp + glyph + summary, with
  a soft pastel wash for navigations so they stand out as "context switches"
  in a stream of clicks/typing/scrolling.
-->
<template>
  <button
    type="button"
    :class="[
      'grid w-full grid-cols-[56px_22px_1fr] items-start gap-2 px-3 py-1.5 text-left text-[13px] leading-snug transition-colors',
      isNavigation
        ? 'bg-teal-50/60 hover:bg-teal-100/70 dark:bg-teal-500/10 dark:hover:bg-teal-500/15'
        : 'hover:bg-muted/60',
    ]"
    @click="$emit('seek', event.timestampMs)"
  >
    <span class="font-mono text-[11px] text-muted-foreground tabular-nums">{{ time }}</span>
    <span :class="['mt-px flex h-4 w-4 items-center justify-center', glyphColor]">
      <Icon :name="glyphName" :size="13" :stroke-width="1.75" />
    </span>
    <span class="min-w-0 break-words text-foreground/90">{{ event.summary }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Icon } from "@deveprobe/ui";
import type { TimelineEvent } from "@deveprobe/shared";

const props = defineProps<{ event: TimelineEvent }>();

defineEmits<{ seek: [ms: number] }>();

const isNavigation = computed(() => props.event.kind === "navigation");

const time = computed(() => {
  const s = Math.max(0, Math.floor(props.event.timestampMs / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
});

// Map user-action subtype → glyph. The capture-streams layer puts the gesture
// in `summary` (e.g. "Clicked …", "Typed …"), so we sniff the prefix.
const glyphName = computed(() => {
  if (isNavigation.value) return "globe";
  const s = props.event.summary;
  if (/^Clicked/.test(s))   return "arrow-right";
  if (/^Typed/.test(s))     return "edit-3";
  if (/^Focused/.test(s))   return "circle";
  if (/^Scrolled/.test(s))  return "chevron-down";
  return "arrow-right";
});

const glyphColor = computed(() => {
  if (isNavigation.value) return "text-teal-500";
  if (/^Typed/.test(props.event.summary))    return "text-amber-500";
  if (/^Focused/.test(props.event.summary))  return "text-foreground/40";
  if (/^Scrolled/.test(props.event.summary)) return "text-muted-foreground";
  return "text-violet-500";
});
</script>
