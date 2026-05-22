<!--
  InfoRow
  ───────
  Label / value row used inside InfoTab. Two-column grid so labels align
  vertically across the whole tab.
-->
<template>
  <div class="grid grid-cols-[112px_1fr] items-start gap-4 py-1.5 text-sm">
    <dt class="text-muted-foreground">{{ label }}</dt>
    <dd class="min-w-0 text-foreground">
      <slot>{{ value ?? "—" }}</slot>
    </dd>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string;
  /** Convenience prop — pass a string for simple values; use the slot for richer content. */
  value?: string | null;
}>();
</script>
