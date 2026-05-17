<!--
  IssueActivity
  ─────────────
  Timeline of system events + comments for the issue. We render the
  "created" event from the issue itself today; the activity_events and
  comments tables are queryable but their endpoints aren't shipped yet, so
  the comment composer here only stages text to a Pinia store (no submit).
  Wire up the API in a follow-up.
-->
<template>
  <section class="space-y-3">
    <h2 class="text-[13px] font-semibold text-foreground flex items-center gap-2">
      Activity
      <span class="text-xs text-muted-foreground">{{ items.length }}</span>
    </h2>

    <ul class="space-y-3">
      <li
        v-for="item in items"
        :key="item.id"
        class="flex items-start gap-3 text-sm text-foreground"
      >
        <span
          class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
        >
          <Icon :name="item.icon" :size="13" :stroke-width="2" />
        </span>
        <p class="flex-1 leading-relaxed">
          <span class="font-medium">{{ item.actor }}</span>
          <span class="text-muted-foreground"> {{ item.verb }} · {{ timeAgo(item.at) }}</span>
        </p>
      </li>
    </ul>

    <!-- Reply composer (UI scaffold; submit wires up when comments API lands) -->
    <form
      class="mt-2 rounded-lg border border-border bg-card p-3 flex flex-col gap-2"
      @submit.prevent
    >
      <Textarea
        v-model="draft"
        placeholder="Leave a comment… use @ to mention"
        rows="2"
        class="border-0 px-0 py-0 text-sm focus-visible:ring-0 resize-none bg-transparent"
      />
      <div class="flex justify-end">
        <Button size="sm" class="gap-1.5 text-xs" :disabled="!draft.trim()">
          <Icon name="send" :size="13" :stroke-width="2" />
          Reply
        </Button>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { Button, Icon, Textarea } from "@deveprobe/ui";
import { timeAgo } from "@/shared/lib/format.js";
import type { Issue } from "@deveprobe/shared";

type IssueWithCreator = Issue & {
  createdBy?: { id: string; name: string | null; email: string | null; avatarUrl: string | null } | null;
};

const props = defineProps<{ issue: IssueWithCreator }>();

const draft = ref("");

const items = computed(() => [
  {
    id: "created",
    icon: "plus",
    actor: props.issue.createdBy?.name ?? props.issue.createdBy?.email ?? "Someone",
    verb: `created this issue from a ${labelForMode(props.issue.mode)}`,
    at: props.issue.createdAt,
  },
]);

function labelForMode(mode: Issue["mode"]): string {
  switch (mode) {
    case "screenshot":       return "screenshot";
    case "screen_recording": return "recording";
    case "live_annotation":  return "pin";
    default:                 return mode;
  }
}
</script>
