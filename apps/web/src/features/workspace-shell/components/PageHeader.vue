<!--
  PageHeader
  ──────────
  Consistent top bar for every authenticated page.
  Slots:
    default — right-side actions (buttons, etc.)
    meta    — small metadata after the title (counts, statuses)
-->
<template>
  <header
    class="h-14 flex items-center justify-between gap-4 px-6 border-b border-border flex-shrink-0 bg-background"
  >
    <div class="flex items-center gap-3 min-w-0">
      <h2 class="text-[15px] font-medium text-foreground truncate">{{ title }}</h2>
      <slot name="meta" />
    </div>
    <div class="flex items-center gap-2 shrink-0">
      <slot />
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{ title: string }>();
</script>
