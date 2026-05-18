<!--
  RecordingCapture
  ────────────────
  Orchestrates the recording compose flow.

  Aligned to SCREEN_RECORDING_SPEC.md → "Upload Flow":
  1. Save a local draft (Blob + form snapshot) to IndexedDB BEFORE upload.
  2. Create the issue (metadata).
  3. Upload the video attachment with retry-with-backoff + phased progress.
  4. On server-confirmed success → delete the draft + open /issue/[id].
  5. On failure → keep the modal open, surface the error, leave the draft
     so the user can retry or download the recording.

  True R2 multipart (chunked / resumable) uploads still need backend work —
  tracked as a Phase-4 TODO in packages/api/src/routes/attachments.ts.
-->
<template>
  <PostComposeModal
    :submitting="busy"
    :error="submitError"
    :page-url="props.browserMeta?.pageUrl"
    heading-mode="Recording"
    :heading-duration-ms="props.durationMs"
    :generating="generating"
    :has-generated="hasGenerated"
    :show-download="true"
    :show-regenerate="true"
    @submit="onSubmit"
    @cancel="emit('close')"
    @download="onDownload"
    @regenerate="onRegenerate"
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
import { computed, ref } from 'vue';
import PostComposeModal, { type ComposeForm } from '../PostComposeModal.vue';
import RecordingPanel from './RecordingPanel.vue';
import { api, type UploadedTimelineEvent } from '../../../lib/api.js';
import { WEB_APP_URL } from '../../../lib/env.js';
import { safeSendMessage } from '../../../lib/extension.js';
import {
  saveDraft,
  deleteDraft,
  markDraftError,
  newDraftId,
} from '../../../lib/recording-drafts.js';
import type { BrowserMeta } from '@deveprobe/shared';
import type { StoredAuth } from '../../../lib/auth.js';
import type { RecordingMarker } from './types.js';

const props = defineProps<{
  videoBlobUrl: string;
  durationMs:   number;
  /** Trimmer-visible markers (warnings + errors). */
  markers?:     RecordingMarker[];
  /** Full timeline event stream — uploaded to /issues/:id/events. */
  events?:      UploadedTimelineEvent[];
  /** Session timing for the recording_sessions row. */
  session?:     { startedAt: string; stoppedAt: string };
  browserMeta:  BrowserMeta;
  auth:         StoredAuth | null;
}>();

const emit = defineEmits<{
  close: [];
}>();

type SubmitPhase = 'idle' | 'saving-draft' | 'creating-issue' | 'encoding' | 'uploading' | 'finalising';

const phase         = ref<SubmitPhase>('idle');
const submitError   = ref('');
const generating    = ref(false);
const hasGenerated  = ref(false);
const lastDraftId   = ref<string | null>(null);
// Once a draft exists from a previous failed attempt, share progress label "Retry upload".
const hadFailure    = ref(false);

// One flag the modal listens to so all phases disable the form.
const busy = computed(() => phase.value !== 'idle');

function onDownload() {
  const a    = document.createElement('a');
  a.href     = props.videoBlobUrl;
  a.download = `recording-${Date.now()}.webm`;
  a.click();
}

function onRegenerate() {
  // Placeholder — AI generation of title/summary will be wired to the
  // backend queue. Once the model returns, the button label flips to
  // "Regenerate".
  generating.value = true;
  setTimeout(() => {
    generating.value   = false;
    hasGenerated.value = true;
  }, 1500);
}

async function openInTab(url: string) {
  const sent = await safeSendMessage<{ ok: boolean }>({ type: 'OPEN_TAB', url });
  if (!sent) window.open(url, '_blank', 'noopener');
}

/** Pull the recorded Blob out of the in-memory blob: URL. */
async function blobFromUrl(url: string): Promise<Blob> {
  const res = await fetch(url);
  return res.blob();
}

async function onSubmit(form: ComposeForm) {
  if (busy.value) return;
  submitError.value = '';

  if (!props.auth?.token) {
    submitError.value = 'Connect a workspace before submitting.';
    return;
  }

  // ── 1. Save local draft FIRST so we can recover on any failure ────────────
  phase.value = 'saving-draft';
  let blob: Blob;
  try {
    blob = await blobFromUrl(props.videoBlobUrl);
  } catch {
    submitError.value = 'Could not read the recording. Please try again.';
    phase.value = 'idle';
    return;
  }

  const draftId = lastDraftId.value ?? newDraftId();
  lastDraftId.value = draftId;
  try {
    await saveDraft({
      id:         draftId,
      createdAt:  Date.now(),
      blob,
      mimeType:   blob.type || 'video/webm',
      durationMs: props.durationMs,
      filename:   `recording-${draftId}.webm`,
      pageUrl:    props.browserMeta.pageUrl,
      form: {
        title:      form.title,
        summary:    form.summary,
        severity:   form.severity,
        visibility: form.visibility,
        tags:       form.tags ?? [],
      },
      retryCount: 0,
    });
  } catch {
    // IndexedDB is best-effort — don't abort the submit, just log.
    console.warn('[DevProbe] Could not persist local draft; proceeding with upload anyway.');
  }

  // ── 2. Create the issue (metadata) ────────────────────────────────────────
  phase.value = 'creating-issue';
  let issueId: string;
  try {
    const issue = await api.createIssue({
      source:      'extension',
      mode:        'screen_recording',
      title:       form.title,
      summary:     form.summary || undefined,
      severity:    form.severity,
      visibility:  form.visibility,
      pageUrl:     props.browserMeta.pageUrl,
      browserMeta: props.browserMeta,
    });
    issueId = issue.id;
  } catch (e) {
    hadFailure.value  = true;
    submitError.value = (e as Error).message || 'Could not create the issue. Please try again.';
    await markDraftError(draftId, submitError.value);
    phase.value = 'idle';
    return;
  }

  // ── 3. Upload the video attachment (with retry-with-backoff) ──────────────
  try {
    await api.uploadAttachment({
      blob,
      filename:   `recording-${issueId}.webm`,
      type:       'video',
      issueId,
      maxRetries: 2,
      onPhase:    (p) => { phase.value = p; },
    });
  } catch (e) {
    hadFailure.value  = true;
    submitError.value =
      (e as Error).message ||
      'Upload failed. Click Submit again to retry — your recording is saved locally.';
    await markDraftError(draftId, submitError.value);
    phase.value = 'idle';
    return;
  }

  // ── 4. Upload timeline events (console/network/errors/user actions/etc.) ──
  // These power the synced panels on the issue details page. We deliberately
  // upload after the video so a partial network failure here doesn't block the
  // issue from being viewable with its primary capture.
  if (props.events && props.events.length > 0) {
    try {
      await api.uploadTimelineEvents({
        issueId,
        events:     props.events,
        durationMs: props.durationMs,
        pageUrl:    props.browserMeta.pageUrl,
        startedAt:  props.session?.startedAt,
        stoppedAt:  props.session?.stoppedAt,
      });
    } catch (e) {
      // Non-fatal — the issue + video still exist. Log and continue so the
      // user gets to the issue page; we can offer a retry from there later.
      console.warn('[DevProbe] Failed to upload timeline events:', (e as Error).message);
    }
  }

  // ── 5. Success: drop the draft and hand off to the web app ────────────────
  await deleteDraft(draftId).catch(() => { /* ignore */ });
  await openInTab(`${WEB_APP_URL}/issue/${issueId}`);
  phase.value = 'idle';
  emit('close');
}

void hadFailure; // reserved for a future Retry-specific UI affordance
</script>
