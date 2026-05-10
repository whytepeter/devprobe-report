<template>
  <div class="min-h-screen bg-[var(--bg-base)] flex items-center justify-center">
    <div class="text-center">
      <p class="font-mono text-4xl font-semibold text-[var(--text-muted)]">404</p>
      <p class="mt-2 text-sm text-[var(--text-secondary)]">Page not found</p>
      <Button variant="ghost" class="mt-6" as-child>
        <RouterLink to="/">Go home</RouterLink>
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
import { Button } from "@deveprobe/ui";
</script>
