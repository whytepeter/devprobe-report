<!-- eslint-disable vue/no-parsing-error -->
<script setup lang="ts">
import { computed } from 'vue';
import * as icons from 'lucide-vue-next';

const props = withDefaults(
  defineProps<{
    name: string;
    size?: number | string;
    color?: string;
    strokeWidth?: number | string;
    defaultClass?: string;
  }>(),
  {
    strokeWidth: 2,
  }
);

const icon = computed(() => {
  const transformName = props.name
    ?.split('-')
    .map((el) => el.charAt(0).toUpperCase() + el.slice(1))
    .join('');
  return icons[transformName as keyof typeof icons] as any;
});
</script>

<template>
  <component
    :is="icon"
    :size="size"
    :color="color"
    :stroke-width="strokeWidth"
    :default-class="defaultClass"
  />
</template>
