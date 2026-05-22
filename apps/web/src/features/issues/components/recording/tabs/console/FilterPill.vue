<!--
  FilterPill
  ──────────
  Tiny pill button used by ConsoleFilters (and reusable by other tabs). Slot
  holds the label; props control the leading affordance (a coloured dot or
  an icon glyph) and the active state.
-->
<template>
  <button
    type="button"
    :aria-pressed="active"
    :class="[
      'inline-flex items-center gap-1.5 rounded-full border px-2.5 h-7 text-[12px] transition-colors',
      active
        ? 'border-foreground bg-foreground text-background'
        : 'border-border bg-background text-foreground/80 hover:bg-muted',
    ]"
    @click="$emit('click')"
  >
    <span v-if="iconColor" :class="['h-1.5 w-1.5 rounded-full', iconColor]" aria-hidden="true" />
    <Icon v-else-if="icon" :name="icon" :size="11" :stroke-width="2" />
    <slot />
  </button>
</template>

<script setup lang="ts">
import { Icon } from "@deveprobe/ui";

defineProps<{
  active?:    boolean;
  /** Coloured dot (mutually exclusive with `icon`). */
  iconColor?: string;
  /** Glyph name (mutually exclusive with `iconColor`). */
  icon?:      string;
}>();

defineEmits<{ click: [] }>();
</script>
