<template>
  <div class="flex-1 flex flex-col overflow-hidden">
    <PageHeader title="Integrations" />

    <div class="flex-1 overflow-auto px-6 py-6">
      <PageEmpty
        icon="link"
        title="Integrations coming soon"
        description="Linear, GitHub, Jira, Slack, and Sentry connectors land in Phase 2. You'll be able to route folders to specific destinations and post issue updates back to chat."
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import PageHeader from "@/features/workspace-shell/components/PageHeader.vue";
import PageEmpty from "@/features/workspace-shell/components/PageEmpty.vue";
</script>
