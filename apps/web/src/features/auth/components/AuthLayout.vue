<!--
  AuthLayout
  ──────────
  Shell for login / signup / extension-connect. Centered card on the
  warm-stone canvas. Keeps these pages visually consistent.
-->
<template>
  <div class="min-h-screen flex items-center justify-center px-4 bg-[var(--bg-base)]">
    <div class="w-full max-w-sm space-y-6">
      <div class="flex items-center gap-2.5">
        <span class="flex h-7 w-7 items-center justify-center rounded-md bg-primary shrink-0">
          <Icon name="hexagon" :size="14" color="#fff" :stroke-width="2.5" />
        </span>
        <span class="text-[15px] font-semibold tracking-tight text-foreground">DevProbe</span>
      </div>
      <div>
        <h1 class="text-lg font-semibold text-foreground">{{ title }}</h1>
        <p v-if="subtitle" class="mt-1 text-sm text-muted-foreground">{{ subtitle }}</p>
      </div>
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@deveprobe/ui';
defineProps<{
  title: string;
  subtitle?: string;
}>();
</script>
