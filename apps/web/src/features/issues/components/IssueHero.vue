<!--
  IssueHero
  ─────────
  Title + meta line at the top of the issue detail page. Meta reads as a
  single line: globe + truncated page URL · reported by avatar+name · time ago.
-->
<template>
  <header class="space-y-2">
    <h1 class="text-2xl font-semibold leading-tight tracking-tight text-foreground">
      {{ issue.title }}
    </h1>

    <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
      <a
        v-if="issue.pageUrl"
        :href="issue.pageUrl"
        target="_blank"
        rel="noopener"
        class="flex items-center gap-1.5 max-w-md truncate hover:text-foreground transition-colors"
      >
        <Icon name="globe" :size="12" :stroke-width="1.75" class="shrink-0" />
        <span class="font-mono truncate">{{ displayUrl }}</span>
      </a>

      <span aria-hidden="true">·</span>

      <span class="flex items-center gap-1.5">
        Reported by
        <UserAvatar :user="issue.createdBy" size="xs" />
        <span class="text-foreground/80">{{ reporterName }}</span>
      </span>

      <span aria-hidden="true">·</span>

      <span>{{ timeAgo(issue.createdAt) }}</span>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Icon } from "@deveprobe/ui";
import UserAvatar from "@/features/issues/components/UserAvatar.vue";
import { timeAgo } from "@/shared/lib/format.js";
import type { Issue } from "@deveprobe/shared";

type IssueWithCreator = Issue & {
  createdBy?: { id: string; name: string | null; email: string | null; avatarUrl: string | null } | null;
};

const props = defineProps<{ issue: IssueWithCreator }>();

const reporterName = computed(
  () => props.issue.createdBy?.name ?? props.issue.createdBy?.email ?? "Unknown",
);

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
