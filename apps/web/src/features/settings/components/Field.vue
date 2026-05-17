<!--
  Field
  ─────
  Small label/value row used inside Settings cards.
-->
<template>
  <div class="flex items-baseline gap-3 py-1">
    <p class="text-xs text-muted-foreground w-32 shrink-0">{{ label }}</p>
    <p
      :class="[
        'text-sm text-foreground truncate',
        mono ? 'font-mono text-xs' : '',
      ]"
    >
      {{ value }}
    </p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string;
  value: string;
  mono?: boolean;
}>();
</script>
