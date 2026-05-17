<template>
  <div class="min-h-screen flex items-center justify-center px-4 bg-[var(--bg-base)]">
    <div class="text-center space-y-3 max-w-xs">
      <p class="font-mono text-4xl font-semibold text-muted-foreground">404</p>
      <p class="text-sm text-foreground font-medium">Page not found</p>
      <p class="text-xs text-muted-foreground">
        The path you followed doesn't exist in this workspace.
      </p>
      <Button variant="outline" size="sm" class="mt-2" as-child>
        <RouterLink to="/">Back to dashboard</RouterLink>
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
import { Button } from "@deveprobe/ui";
</script>
