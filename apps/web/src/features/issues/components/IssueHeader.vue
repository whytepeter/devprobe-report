<template>
  <header class="h-14 flex items-center gap-3 px-6 border-b border-border flex-shrink-0 bg-background">
    <Button variant="ghost" size="icon-sm" class="shrink-0" as-child>
      <RouterLink to="/dashboard">
        <Icon name="arrow-left" :size="16" :stroke-width="1.5" />
      </RouterLink>
    </Button>
    <span class="text-xs text-muted-foreground font-mono truncate">{{ issueId }}</span>
    <span v-if="issue" class="ml-auto flex items-center gap-2">
      <SeverityChip :severity="issue.severity" />
      <StatusChip :status="issue.status" />
    </span>
  </header>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
import { Button, Icon } from "@deveprobe/ui";
import SeverityChip from "@/features/issues/components/SeverityChip.vue";
import StatusChip from "@/features/issues/components/StatusChip.vue";
import type { Issue } from "@deveprobe/shared";

defineProps<{
  issueId: string;
  issue: Issue | null;
}>();
</script>
