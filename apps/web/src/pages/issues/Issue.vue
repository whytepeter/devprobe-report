<template>
  <div class="flex-1 flex flex-col overflow-hidden">
    <!-- Compact top bar — back + short id + mode icon. Title moves into the hero. -->
    <header class="h-12 flex items-center gap-3 px-6 border-b border-border flex-shrink-0 bg-background">
      <Button variant="ghost" size="sm" class="gap-1.5 text-xs -ml-2" as-child>
        <RouterLink to="/issues">
          <Icon name="chevron-left" :size="14" :stroke-width="1.75" />
          Back
        </RouterLink>
      </Button>
      <span
        v-if="issue"
        class="rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] text-foreground/80"
      >
        {{ issueId.slice(0, 8) }}
      </span>
      <TypeChip v-if="issue" :mode="issue.mode" class="ml-0.5" />
      <span v-if="issue" class="ml-auto flex items-center gap-2">
        <SeverityChip :severity="issue.severity" />
        <StatusChip :status="issue.status" />
      </span>
    </header>

    <div class="flex-1 overflow-auto">
      <div v-if="loading" class="h-full flex items-center justify-center text-muted-foreground text-sm">
        Loading issue…
      </div>

      <PageEmpty
        v-else-if="error === 'unauthorized'"
        icon="lock"
        title="Sign in to view this issue"
        description="Issues are scoped to your workspace. Sign in with the account that owns it."
      >
        <Button size="sm" as-child>
          <RouterLink :to="`/login?redirect=/issue/${issueId}`">Sign in</RouterLink>
        </Button>
      </PageEmpty>

      <PageEmpty
        v-else-if="error === 'not-found'"
        icon="search-x"
        title="Issue not found"
        description="This id doesn't belong to any issue in your workspace. If the extension created it without a connected workspace, it was never persisted — connect the extension and try again."
      >
        <Button size="sm" variant="outline" as-child>
          <RouterLink to="/extension/connect">Connect the extension</RouterLink>
        </Button>
      </PageEmpty>

      <PageEmpty
        v-else-if="error"
        icon="circle-x"
        title="Couldn't load this issue"
        :description="errorMessage"
      />

      <article v-else-if="issue" class="max-w-3xl mx-auto px-6 py-6 space-y-6">
        <IssueHero :issue="issue" />

        <IssueMedia :issue="issue" :attachments="issue.attachments" />

        <IssueDescription :summary="issue.summary" />

        <IssueAttachmentsList v-if="extraAttachments.length" :attachments="extraAttachments" />

        <IssueActivity :issue="issue" />
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { Button, Icon } from "@deveprobe/ui";
import IssueHero from "@/features/issues/components/IssueHero.vue";
import IssueMedia from "@/features/issues/components/IssueMedia.vue";
import IssueDescription from "@/features/issues/components/IssueDescription.vue";
import IssueActivity from "@/features/issues/components/IssueActivity.vue";
import IssueAttachmentsList from "@/features/issues/components/IssueAttachments.vue";
import TypeChip from "@/features/issues/components/TypeChip.vue";
import SeverityChip from "@/features/issues/components/SeverityChip.vue";
import StatusChip from "@/features/issues/components/StatusChip.vue";
import PageEmpty from "@/features/workspace-shell/components/PageEmpty.vue";
import { useIssue } from "@/features/issues/composables/useIssue.js";

const route = useRoute();
const issueId = computed(() => route.params["id"]?.toString() ?? "");

const { issue, loading, error, errorMessage } = useIssue(issueId);

// The hero already renders the first screenshot/thumbnail attachment; show
// everything else (recordings, exports, etc.) below the description.
const HERO_TYPES = new Set(["screenshot", "thumbnail"]);
const extraAttachments = computed(() => {
  const all = issue.value?.attachments ?? [];
  const heroId = all.find((a) => HERO_TYPES.has(a.type))?.id;
  return all.filter((a) => a.id !== heroId);
});
</script>
