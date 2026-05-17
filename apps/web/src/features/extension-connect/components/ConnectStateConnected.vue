<template>
  <div class="space-y-3 text-center">
    <div class="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center">
      <Icon name="check" :size="20" :stroke-width="2" />
    </div>
    <p class="text-sm font-medium">Extension connected</p>
    <p class="text-xs text-muted-foreground">
      You can close this tab and use the extension popup to capture issues.
    </p>
  </div>
</template>

<script setup lang="ts">
import { Icon } from "@deveprobe/ui";
</script>
