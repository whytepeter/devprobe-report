<template>
  <ul class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-6 py-5">
    <li v-for="issue in issues" :key="issue.id">
      <IssueCard :issue="issue" />
    </li>
  </ul>
</template>

<script setup lang="ts">
import IssueCard from "@/features/dashboard/components/IssueCard.vue";
import type { Issue, Attachment } from "@deveprobe/shared";

type IssueRow = Issue & {
  attachments?: Attachment[];
  createdBy?: { id: string; name: string | null; email: string | null; avatarUrl: string | null } | null;
};

defineProps<{ issues: IssueRow[] }>();
</script>
