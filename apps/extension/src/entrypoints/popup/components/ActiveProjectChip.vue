<!--
  ActiveProjectChip
  ─────────────────
  Read-only strip under the action list that shows the project new issues
  will be filed into. Hint to use the AccountMenu (above) to change it.
-->
<template>
  <div
    v-if="loading"
    class="px-4 pb-3 -mt-1 text-[11px] text-muted-foreground italic"
  >
    Loading workspace…
  </div>

  <div
    v-else-if="activeProject"
    class="mx-4 mb-3 -mt-1 flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1.5"
  >
    <Icon name="folder-open" :size="12" :stroke-width="1.75" class="text-muted-foreground shrink-0" />
    <span class="text-[11px] text-muted-foreground">Filing to</span>
    <span class="text-[11px] font-medium text-foreground truncate flex-1">{{ activeProject.name }}</span>
    <span class="font-mono text-[10px] text-muted-foreground shrink-0">{{ activeProject.slug }}</span>
  </div>

  <div
    v-else
    class="mx-4 mb-3 -mt-1 flex items-start gap-2 rounded-md border border-dashed border-border bg-muted/30 px-2.5 py-2"
  >
    <Icon name="info" :size="12" :stroke-width="1.75" class="text-muted-foreground shrink-0 mt-px" />
    <p class="text-[11px] leading-snug text-muted-foreground">
      No project picked. Open the menu (top right) to choose one.
    </p>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@deveprobe/ui';
import type { Project } from '@deveprobe/shared';

defineProps<{
  activeProject: Project | null;
  loading: boolean;
}>();
</script>
