<!--
  IssuePage
  ─────────
  Top-level orchestrator for /issue/:id. Two-region body:

       ┌──────────────────────────────────────────┬─────────────────┐
       │                                          │                 │
       │   scrollable article column              │   side panel    │
       │   ├ mode-specific hero                   │   (recording    │
       │   ├ url line                             │    mode only)   │
       │   ├ title + description                  │                 │
       │   ├ details card                         │   sticky, hangs │
       │   └ activity feed                        │   off page edge │
       │                                          │                 │
       └──────────────────────────────────────────┴─────────────────┘

  The side panel lives at the PAGE level (not inside RecordingView) so it
  doesn't visually clip into the video card. It's only rendered for
  recording-mode issues; other modes get the full article width.

  Composition (kept narrow):
    • IssueDetailHeader   — top nav bar
    • <mode>View          — exactly one of Screenshot / Pin / Recording
    • IssueUrlLine        — 🌐 url ─── 🖥️ mode chip
    • IssueTitleBlock     — title + editable description
    • IssueDetailsCard    — status/severity/assignee/reporter + tags
    • IssueActivity       — activity feed + comment composer
    • RecordingSidePanel  — Info / Console / Network / Actions (recording only)

  click-to-seek bridge: side panel → IssuePage.onSeek → recordingViewRef.seekTo
-->
<template>
  <div class="flex-1 flex flex-col overflow-hidden">
    <IssueDetailHeader
      :issue-id="issueId"
      :issue="issue"
      @send="onSend"
      @share="onShare"
      @menu="onMenu"
    />

    <div class="flex-1 flex min-h-0 overflow-hidden">
      <!-- Scrollable article column -->
      <div class="flex-1 min-w-0 overflow-auto">
        <IssuePageSkeleton v-if="loading" />

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

        <article v-else-if="issue" class="max-w-5xl mx-auto px-8 py-8 space-y-8">
          <!-- Mode-specific hero — exactly one renders. -->
          <RecordingView
            v-if="issue.mode === 'screen_recording'"
            ref="recordingViewRef"
            :issue="issue"
            :attachments="issue.attachments"
            :events="events"
          />
          <ScreenshotView
            v-else-if="issue.mode === 'screenshot'"
            :issue="issue"
            :attachments="issue.attachments"
          />
          <PinView
            v-else-if="issue.mode === 'live_annotation'"
            :issue="issue"
            :attachments="issue.attachments"
          />

          <IssueUrlLine :issue="issue" />

          <IssueTitleBlock
            :title="issue.title"
            :summary="issue.summary"
            @update:title="onUpdateTitle"
            @update:summary="onUpdateSummary"
          />

          <!-- IssueDetailsCard owns its own mutations (status/severity/assignee/tags). -->
          <IssueDetailsCard :issue="issue" />

          <IssueActivity :issue="issue" />
        </article>
      </div>

      <!-- Side panel — only for recording mode; hangs off the page edge so
           it visually belongs to the page, not to the video card. -->
      <RecordingSidePanel
        v-if="issue && issue.mode === 'screen_recording'"
        :open="panel.open.value"
        :active-tab="panel.activeTab.value"
        :issue="issue"
        :events="events"
        :duration-ms="recordingDurationMs"
        @toggle="panel.toggle"
        @set-tab="panel.setTab($event)"
        @seek="onSeek"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { Button } from "@deveprobe/ui";
import IssueDetailHeader from "@/features/issues/components/IssueDetailHeader.vue";
import IssuePageSkeleton from "@/features/issues/components/IssuePageSkeleton.vue";
import PageEmpty        from "@/features/workspace-shell/components/PageEmpty.vue";
import ScreenshotView   from "@/features/issues/components/ScreenshotView.vue";
import PinView          from "@/features/issues/components/PinView.vue";
import RecordingView    from "@/features/issues/components/RecordingView.vue";
import IssueUrlLine     from "@/features/issues/components/IssueUrlLine.vue";
import IssueTitleBlock  from "@/features/issues/components/IssueTitleBlock.vue";
import IssueDetailsCard from "@/features/issues/components/IssueDetailsCard.vue";
import IssueActivity    from "@/features/issues/components/IssueActivity.vue";
import RecordingSidePanel from "@/features/issues/components/recording/RecordingSidePanel.vue";
import { useRecordingSidePanel } from "@/features/issues/components/recording/useRecordingSidePanel.js";
import { useIssue }            from "@/features/issues/composables/useIssue.js";
import { useIssueEvents }      from "@/features/issues/composables/useIssueEvents.js";
import { useUpdateIssue }      from "@/features/issues/composables/useIssueMutations.js";

const route   = useRoute();
const issueId = computed(() => route.params["id"]?.toString() ?? "");

const { issue, loading, error, errorMessage } = useIssue(issueId);

// ── Recording-mode plumbing ─────────────────────────────────────────────────
// Owned at this level (not inside RecordingView) so the side panel — which
// sits as a SIBLING of the article — can read the same events stream and
// drive the video's seek via the ref below.
const recordingViewRef = ref<InstanceType<typeof RecordingView> | null>(null);
const panel = useRecordingSidePanel(true);
const { events } = useIssueEvents(issueId);

const recordingDurationMs = computed<number>(() => {
  const video = issue.value?.attachments.find((a) => a.type === "video");
  return video?.durationMs ?? 0;
});

function onSeek(ms: number) { recordingViewRef.value?.seekTo(ms); }

// ── Title / description mutations ───────────────────────────────────────────
const update = useUpdateIssue();
function onUpdateTitle(next: string) {
  if (!issue.value || next === issue.value.title) return;
  void update.mutateAsync({ id: issue.value.id, patch: { title: next } });
}
function onUpdateSummary(next: string) {
  if (!issue.value || next === issue.value.summary) return;
  void update.mutateAsync({ id: issue.value.id, patch: { summary: next || null } });
}

// ── Header action stubs (Send / Share / Menu — UI scaffolds) ────────────────
function onSend ()  { console.info("[issue] send (⌘E) clicked"); }
function onShare()  { console.info("[issue] share clicked"); }
function onMenu ()  { console.info("[issue] menu clicked"); }
</script>
