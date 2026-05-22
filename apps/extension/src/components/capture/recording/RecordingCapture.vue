<!--
  RecordingCapture
  ────────────────
  Orchestrates the recording compose flow.

  Responsibilities (kept narrow on purpose):
    • Plug RecordingPanel into PostComposeModal's #media slot.
    • Provide the modal with mode-specific Download config + AI generate fn —
      the modal owns the heading buttons, generating state, and form
      application (see PostComposeModal + IssueComposePanel.applyFields()).
    • Delegate the submit pipeline to `useRecordingSubmit` so this file stays
      a thin glue layer.

  Anything cross-capture (download UX, AI fill-in, form state) lives in the
  modal/panel — DO NOT duplicate it here.
-->
<template>
  <PostComposeModal
    :submitting="busy"
    :submit-label="submitLabel"
    :error="submitError"
    :page-url="props.browserMeta?.pageUrl"
    heading-mode="Recording"
    :heading-duration-ms="props.durationMs"
    :download="downloadConfig"
    :ai-generate="aiGenerate"
    @submit="submit"
    @cancel="emit('close')"
  >
    <template #media>
      <RecordingPanel
        :video-src="props.videoBlobUrl"
        :duration-ms="props.durationMs"
        :markers="props.markers"
      />
    </template>
  </PostComposeModal>
</template>

<script setup lang="ts">
import { toRef } from 'vue';
import PostComposeModal, { type AiGenerated } from '../PostComposeModal.vue';
import RecordingPanel from './RecordingPanel.vue';
import { useRecordingSubmit } from './useRecordingSubmit.js';
import type { UploadedTimelineEvent } from '../../../lib/api.js';
import type { BrowserMeta } from '@deveprobe/shared';
import type { StoredAuth } from '../../../lib/auth.js';
import type { RecordingMarker } from './types.js';

const props = defineProps<{
  /** In-memory blob: URL for the hero video (first segment when multi-segment). */
  videoBlobUrl: string;
  /** Total duration across all segments, ms. */
  durationMs:   number;
  /** Trimmer-visible markers (warnings + errors). */
  markers?:     RecordingMarker[];
  /** Full timeline event stream — uploaded to /issues/:id/events. */
  events?:      UploadedTimelineEvent[];
  /** Session timing for the recording_sessions row. */
  session?:     { startedAt: string; stoppedAt: string };
  browserMeta:  BrowserMeta;
  auth:         StoredAuth | null;
  /**
   * All recorded segments in chronological order. Single-segment recordings
   * may omit this — the pipeline will fall back to `videoBlobUrl`.
   */
  segmentBlobs?: Blob[];
}>();

const emit = defineEmits<{ close: [] }>();

// ── Submit pipeline (modularised in useRecordingSubmit) ─────────────────────
// `busy` drives the modal's `:submitting`; `submitLabel` drives the button.
// `submit` is bound straight to PostComposeModal's @submit (signature already
// matches (form: ComposeForm) => Promise<void>).
const {
  busy,
  submitLabel,
  submitError,
  submit,
} = useRecordingSubmit({
  videoBlobUrl: toRef(props, 'videoBlobUrl'),
  durationMs:   toRef(props, 'durationMs'),
  events:       toRef(props, 'events'),
  session:      toRef(props, 'session'),
  browserMeta:  toRef(props, 'browserMeta'),
  auth:         toRef(props, 'auth'),
  segmentBlobs: toRef(props, 'segmentBlobs'),
  onSuccess:    () => emit('close'),
});

// ── Download (raw recording) ────────────────────────────────────────────────
// The blob URL is stable for the modal's lifetime, so eager is fine here.
const downloadConfig = {
  getHref:  () => props.videoBlobUrl,
  filename: `recording-${Date.now()}.webm`,
};

// ── AI generate (title + reproduction steps + tags) ─────────────────────────
// Backend wiring is pending — stubbed so the UX flows. The modal applies the
// returned fields to the form via IssueComposePanel.applyFields().
async function aiGenerate(): Promise<AiGenerated> {
  await new Promise((r) => setTimeout(r, 1500));
  // TODO: call AI endpoint with { videoUrl, events, browserMeta }.
  return { title: '', summary: '', tags: [] };
}
</script>
