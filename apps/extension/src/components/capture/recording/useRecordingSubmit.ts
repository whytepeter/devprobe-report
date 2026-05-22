/**
 * useRecordingSubmit
 * ──────────────────
 * Encapsulates the full recording → issue pipeline so RecordingCapture.vue
 * stays a thin orchestrator.
 *
 * Pipeline (per SCREEN_RECORDING_SPEC.md → "Upload Flow"):
 *   1. Save a local IndexedDB draft BEFORE upload (failure recovery).
 *   2. Create the issue (metadata).
 *   3. Upload the video via R2 multipart with byte-level progress.
 *   4. Upload timeline events (non-fatal — the issue is still viewable
 *      with just the video if this step fails).
 *   5. On confirmed success → delete the draft + open /issue/[id].
 *
 * The composable exposes a single `submit(form)` plus reactive state:
 *   • phase           — coarse pipeline phase, drives the submit label
 *   • uploadProgress  — 0–100 during the upload phase
 *   • busy            — true whenever phase !== 'idle'
 *   • submitLabel     — human-readable label for the submit button
 *   • submitError     — surfaced error message (empty when none)
 */
import { computed, ref, type ComputedRef, type Ref } from 'vue';
import type { ComposeForm } from '../PostComposeModal.vue';
import type { BrowserMeta } from '@deveprobe/shared';
import type { StoredAuth } from '../../../lib/auth.js';
import { api, type UploadedTimelineEvent } from '../../../lib/api.js';
import { WEB_APP_URL } from '../../../lib/env.js';
import { safeSendMessage } from '../../../lib/extension.js';
import {
  saveDraft,
  deleteDraft,
  markDraftError,
  newDraftId,
} from '../../../lib/recording-drafts.js';

export type SubmitPhase =
  | 'idle'
  | 'saving-draft'
  | 'creating-issue'
  | 'encoding'
  | 'uploading'
  | 'finalising';

export interface UseRecordingSubmitInput {
  videoBlobUrl: Ref<string>;
  durationMs:   Ref<number>;
  events:       Ref<UploadedTimelineEvent[] | undefined>;
  session:      Ref<{ startedAt: string; stoppedAt: string } | undefined>;
  browserMeta:  Ref<BrowserMeta>;
  auth:         Ref<StoredAuth | null>;
  /**
   * Optional segment list for multi-segment recordings (created when a reload
   * interrupted the session). When provided, every segment is uploaded:
   *   • segments[0] → 'video' (hero)
   *   • segments[1..] → 'clip' (continuation parts, in order)
   * When empty or omitted, the pipeline falls back to the single blob at
   * `videoBlobUrl`.
   */
  segmentBlobs: Ref<Blob[] | undefined>;
  onSuccess:    () => void;
}

export interface UseRecordingSubmit {
  phase:          Ref<SubmitPhase>;
  uploadProgress: Ref<number>;
  submitError:    Ref<string>;
  busy:           ComputedRef<boolean>;
  submitLabel:    ComputedRef<string | undefined>;
  submit:         (form: ComposeForm) => Promise<void>;
}

export function useRecordingSubmit(input: UseRecordingSubmitInput): UseRecordingSubmit {
  const phase          = ref<SubmitPhase>('idle');
  const uploadProgress = ref(0);
  const submitError    = ref('');
  const lastDraftId    = ref<string | null>(null);

  const busy = computed(() => phase.value !== 'idle');

  const submitLabel = computed<string | undefined>(() => {
    switch (phase.value) {
      case 'saving-draft':   return 'Saving draft…';
      case 'creating-issue': return 'Creating issue…';
      case 'encoding':       return 'Encoding…';
      case 'uploading':
        return uploadProgress.value > 0
          ? `Uploading ${uploadProgress.value}%…`
          : 'Uploading…';
      case 'finalising':     return 'Finalising…';
      default:               return undefined;
    }
  });

  /** Pull the recorded Blob out of the in-memory blob: URL. */
  async function blobFromUrl(url: string): Promise<Blob> {
    const res = await fetch(url);
    return res.blob();
  }

  /** Open the issue page in a new tab (routes via background — chrome.tabs is SW-only). */
  async function openInTab(url: string) {
    const sent = await safeSendMessage<{ ok: boolean }>({ type: 'OPEN_TAB', url });
    if (!sent) window.open(url, '_blank', 'noopener');
  }

  async function failWithDraft(draftId: string, message: string) {
    submitError.value = message;
    await markDraftError(draftId, message).catch(() => null);
    phase.value = 'idle';
  }

  async function submit(form: ComposeForm) {
    if (busy.value) return;
    submitError.value = '';

    if (!input.auth.value?.token) {
      submitError.value = 'Connect a workspace before submitting.';
      return;
    }

    // ── 1. Read the blobs + persist a draft FIRST ────────────────────────────
    // Multi-segment recordings (created when a reload interrupted the session)
    // arrive as `segmentBlobs`. Single-segment recordings fall back to fetching
    // the hero URL. Either way, `allBlobs` is the chronological list to upload.
    phase.value = 'saving-draft';
    let allBlobs: Blob[];
    try {
      const provided = input.segmentBlobs.value;
      allBlobs = provided && provided.length > 0
        ? provided
        : [await blobFromUrl(input.videoBlobUrl.value)];
    } catch {
      submitError.value = 'Could not read the recording. Please try again.';
      phase.value = 'idle';
      return;
    }
    const heroBlob = allBlobs[0]!;

    const draftId = lastDraftId.value ?? newDraftId();
    lastDraftId.value = draftId;
    try {
      await saveDraft({
        id:         draftId,
        createdAt:  Date.now(),
        blob:       heroBlob,                  // first segment is the recoverable hero
        mimeType:   heroBlob.type || 'video/webm',
        durationMs: input.durationMs.value,
        filename:   `recording-${draftId}.webm`,
        pageUrl:    input.browserMeta.value.pageUrl,
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
      // IndexedDB is best-effort — don't abort, just log.
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
        pageUrl:     input.browserMeta.value.pageUrl,
        browserMeta: input.browserMeta.value,
      });
      issueId = issue.id;
    } catch (e) {
      await failWithDraft(draftId, (e as Error).message || 'Could not create the issue. Please try again.');
      return;
    }

    // ── 3. Upload every segment (R2 multipart, byte-level progress) ──────────
    // Single-segment is the common case; multi-segment kicks in after a reload
    // interrupted the recording. We upload the hero as type='video' so the
    // issue page renders it as the primary capture, and any continuation
    // segments as type='clip' (in order).
    uploadProgress.value = 0;
    const totalBytes = allBlobs.reduce((sum, b) => sum + b.size, 0);
    let uploadedBytes = 0;
    try {
      for (let i = 0; i < allBlobs.length; i++) {
        const segment = allBlobs[i]!;
        const isHero  = i === 0;
        const partSuffix = allBlobs.length > 1 ? `-part${i + 1}` : '';
        // Per-segment progress maps into the global (totalBytes) progress bar.
        const segmentStart = uploadedBytes;
        await api.uploadAttachmentMultipart({
          blob:        segment,
          filename:    `recording-${issueId}${partSuffix}.webm`,
          type:        isHero ? 'video' : 'clip',
          issueId,
          onPhase:     (p) => { phase.value = p; },
          onProgress:  (pct) => {
            // pct is 0–100 for THIS segment; convert to global.
            const segBytes = Math.round((pct / 100) * segment.size);
            uploadProgress.value = totalBytes === 0
              ? 0
              : Math.round(((segmentStart + segBytes) / totalBytes) * 100);
          },
        });
        uploadedBytes += segment.size;
        uploadProgress.value = totalBytes === 0
          ? 100
          : Math.round((uploadedBytes / totalBytes) * 100);
      }
    } catch (e) {
      await failWithDraft(
        draftId,
        (e as Error).message ||
          'Upload failed. Click Submit again to retry — your recording is saved locally.',
      );
      return;
    }

    // ── 4. Upload timeline events (non-fatal) ─────────────────────────────────
    // The video is already saved — a partial events failure must NOT block
    // the user from reaching the issue page.
    const events = input.events.value;
    if (events && events.length > 0) {
      try {
        await api.uploadTimelineEvents({
          issueId,
          events,
          durationMs: input.durationMs.value,
          pageUrl:    input.browserMeta.value.pageUrl,
          startedAt:  input.session.value?.startedAt,
          stoppedAt:  input.session.value?.stoppedAt,
        });
      } catch (e) {
        console.warn('[DevProbe] Failed to upload timeline events:', (e as Error).message);
      }
    }

    // ── 5. Success ────────────────────────────────────────────────────────────
    await deleteDraft(draftId).catch(() => null);
    await openInTab(`${WEB_APP_URL}/issue/${issueId}`);
    phase.value = 'idle';
    input.onSuccess();
  }

  return { phase, uploadProgress, submitError, busy, submitLabel, submit };
}
