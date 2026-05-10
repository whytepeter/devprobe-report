<!--
  Icon
  ────
  Thin wrapper around lucide-vue-next.
  Works inside shadow DOM — lucide renders plain SVGs, no CSS injection.

  Usage:
    <Icon name="arrow-right" />
    <Icon name="pencil" :size="16" :stroke-width="2" />
-->
<script setup lang="ts">
import { computed } from 'vue';
import * as icons from 'lucide-vue-next';

const props = withDefaults(defineProps<{
  name:         string;
  size?:        number | string;
  color?:       string;
  strokeWidth?: number | string;
}>(), {
  size:        16,
  strokeWidth: 2,
});

const icon = computed(() => {
  const pascal = props.name
    .split('-')
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
  return (icons as Record<string, unknown>)[pascal] as any;
});
</script>

<template>
  <component :is="icon" :size="size" :color="color" :stroke-width="strokeWidth" />
</template>
