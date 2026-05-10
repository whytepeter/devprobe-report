<template>
  <div class="flex-1 flex flex-col overflow-hidden">
    <header class="h-12 flex items-center px-5 border-b border-border flex-shrink-0 bg-background">
      <h2 class="text-md font-medium text-foreground">Settings</h2>
    </header>
    <div class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <Icon name="settings-2" :size="28" :stroke-width="1" class="text-[var(--text-muted)] mx-auto mb-3" />
        <p class="text-sm text-[var(--text-secondary)] font-medium">Coming in Phase 2</p>
        <p class="text-xs text-[var(--text-muted)] mt-1">Team members, integrations, AI settings, billing.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Icon from "@/components/base/Icon.vue";
</script>
