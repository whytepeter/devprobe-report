<!--
  IssueUrlLine
  ────────────
  Thin strip between the mode-specific hero and the title. Two halves:
    LEFT   — globe icon + truncated pageUrl (links out to the actual page)
    RIGHT  — mode badge (Screenshot / Pin / Recording / Imported)

  Sits in EVERY mode view's chrome — kept separate so the hero components
  don't duplicate this exact layout.
-->
<template>
  <div class="flex items-center justify-between gap-3 text-xs text-muted-foreground">
    <a
      v-if="issue.pageUrl"
      :href="issue.pageUrl"
      target="_blank"
      rel="noopener"
      class="flex min-w-0 items-center gap-1.5 truncate hover:text-foreground transition-colors"
    >
      <Icon name="globe" :size="12" :stroke-width="1.75" class="shrink-0" />
      <span class="font-mono truncate">{{ displayUrl }}</span>
    </a>
    <span v-else class="text-muted-foreground/60">No page URL</span>

    <TypeChip :mode="issue.mode" class="shrink-0" />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Icon } from "@deveprobe/ui";
import TypeChip from "@/features/issues/components/TypeChip.vue";
import type { Issue } from "@deveprobe/shared";

const props = defineProps<{ issue: Issue }>();

const displayUrl = computed(() => {
  if (!props.issue.pageUrl) return "";
  try {
    const u = new URL(props.issue.pageUrl);
    return u.host + (u.pathname === "/" ? "" : u.pathname);
  } catch {
    return props.issue.pageUrl;
  }
});
</script>
