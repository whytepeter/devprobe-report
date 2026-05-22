<!--
  TabButton
  ─────────
  Tab pill inside the side-panel header strip. Two affordances:
    • active state — bottom 2px accent + foreground text
    • error badge  — small red dot when `errorCount > 0`
-->
<template>
  <button
    type="button"
    :class="[
      'relative inline-flex items-center gap-1.5 px-3 h-9 text-[13px] font-medium transition-colors',
      active
        ? 'text-foreground'
        : 'text-muted-foreground hover:text-foreground',
    ]"
    :aria-selected="active"
    role="tab"
    @click="$emit('click')"
  >
    <slot />
    <span
      v-if="errorCount && errorCount > 0"
      class="inline-block h-1.5 w-1.5 rounded-full bg-rose-500"
      :aria-label="`${errorCount} errors`"
    />
    <span
      v-if="active"
      class="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-foreground"
      aria-hidden="true"
    />
  </button>
</template>

<script setup lang="ts">
defineProps<{
  active?:     boolean;
  errorCount?: number;
}>();

defineEmits<{ click: [] }>();
</script>
