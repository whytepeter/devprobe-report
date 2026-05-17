<template>
  <article
    class="rounded-lg border border-border bg-card p-4 hover:border-primary/40 transition-colors"
  >
    <header class="flex items-start justify-between gap-3 mb-1">
      <p class="text-sm font-medium text-foreground truncate">{{ project.name }}</p>
      <span class="font-mono text-[10px] text-muted-foreground shrink-0">{{ project.slug }}</span>
    </header>
    <p v-if="project.description" class="text-xs text-muted-foreground line-clamp-2">
      {{ project.description }}
    </p>
    <p v-else class="text-xs italic text-muted-foreground/70">No description.</p>
  </article>
</template>

<script setup lang="ts">
import type { Project } from "@deveprobe/shared";

defineProps<{ project: Project }>();
</script>
