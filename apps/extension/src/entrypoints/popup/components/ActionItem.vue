<!-- Single capture action row -->
<template>
  <button
    type="button"
    :disabled="disabled"
    @click="!disabled && $emit('click')"
    :class="[
      'flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-left border-0',
      'bg-transparent font-sans cursor-pointer transition-all duration-100',
      'focus-visible:outline-none active:scale-[0.99]',
      disabled
        ? 'opacity-40 cursor-not-allowed'
        : 'hover:bg-secondary group',
    ]"
  >
    <!-- Icon -->
    <span
      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl
             bg-muted text-muted-foreground
             group-hover:text-foreground transition-colors"
    >
      <slot name="icon" />
    </span>

    <!-- Content -->
    <span class="flex flex-col gap-0.5 flex-1 min-w-0">
      <span class="flex items-center gap-2">
        <span class="text-[13px] font-medium text-foreground leading-snug">{{ label }}</span>
        <Badge v-if="badge" variant="secondary" class="text-[10px] px-1.5 py-0">{{ badge }}</Badge>
      </span>
      <span class="text-[11px] text-muted-foreground truncate leading-snug">{{ description }}</span>
    </span>

    <!-- Arrow -->
    <svg
      v-if="!disabled"
      viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      class="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
    >
      <path d="M9 18l6-6-6-6"/>
    </svg>
  </button>
</template>

<script setup lang="ts">
import { Badge } from '@deveprobe/ui';

defineProps<{
  label:       string;
  description: string;
  disabled?:   boolean;
  badge?:      string;
}>();

defineEmits<{ click: [] }>();
</script>
