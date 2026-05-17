<template>
  <table class="w-full text-sm">
    <tbody class="divide-y divide-border">
      <IssueRow v-for="issue in issues" :key="issue.id" :issue="issue" />
    </tbody>
  </table>
</template>

<script setup lang="ts">
import type { Issue } from "@deveprobe/shared";
import IssueRow from "@/features/dashboard/components/IssueRow.vue";

defineProps<{ issues: Issue[] }>();
</script>
