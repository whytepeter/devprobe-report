<!--
  ViewToggle
  ──────────
  Two icon buttons for switching between grid and list view of the Issues
  page. Active state mirrors shadcn's "outline + filled" pattern.
-->
<template>
  <div
    role="tablist"
    aria-label="View"
    class="inline-flex rounded-md border border-border bg-card p-0.5 gap-0.5"
  >
    <button
      v-for="opt in OPTIONS"
      :key="opt.value"
      type="button"
      role="tab"
      :aria-selected="modelValue === opt.value"
      :class="[
        'flex h-7 w-7 items-center justify-center rounded transition-colors',
        modelValue === opt.value
          ? 'bg-foreground text-background'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted',
      ]"
      :aria-label="opt.label"
      @click="$emit('update:modelValue', opt.value)"
    >
      <Icon :name="opt.icon" :size="13" :stroke-width="2" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { Icon } from "@deveprobe/ui";

export type IssuesView = "grid" | "list";

defineProps<{ modelValue: IssuesView }>();
defineEmits<{ "update:modelValue": [view: IssuesView] }>();

const OPTIONS: { value: IssuesView; icon: string; label: string }[] = [
  { value: "grid", icon: "layout-grid", label: "Grid view" },
  { value: "list", icon: "list",        label: "List view" },
];
</script>
