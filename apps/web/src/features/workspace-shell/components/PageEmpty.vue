<!--
  PageEmpty
  ─────────
  Consistent empty / not-found / unauthorised state across pages.
-->
<template>
  <div class="flex-1 flex items-center justify-center px-6">
    <div class="max-w-sm text-center space-y-3">
      <div
        class="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground"
      >
        <Icon :name="icon" :size="20" :stroke-width="1.5" />
      </div>
      <p class="text-sm font-medium text-foreground">{{ title }}</p>
      <p v-if="description" class="text-xs text-muted-foreground leading-relaxed">
        {{ description }}
      </p>
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@deveprobe/ui';
defineProps<{
  icon: string;
  title: string;
  description?: string;
}>();
</script>
