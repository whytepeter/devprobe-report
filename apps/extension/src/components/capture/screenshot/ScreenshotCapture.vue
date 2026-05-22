<!--
  ScreenshotCapture
  ─────────────────
  Orchestrates the screenshot compose flow.

  Responsibilities (kept narrow on purpose):
    • Plug ScreenshotPanel into PostComposeModal's #media slot.
    • Provide the modal with mode-specific Download config + AI generate fn —
      the modal itself owns the heading buttons, generating state, and form
      application (see PostComposeModal + IssueComposePanel.applyFields()).
    • Drive the API submit: createIssue → uploadAttachment → open issue tab.

  Anything cross-capture (download UX, AI fill-in, form state) lives in the
  modal/panel — DO NOT duplicate it here.
-->
<template>
  <PostComposeModal
    :submitting="submitting"
    :error="submitError"
    :page-url="props.browserMeta?.pageUrl"
    heading-mode="Screenshot"
    :download="downloadConfig"
    :ai-generate="aiGenerate"
    @submit="onSubmit"
    @cancel="emit('close')"
  >
    <template #media>
      <ScreenshotPanel ref="panel" :screenshot-data-url="screenshotDataUrl" />
    </template>
  </PostComposeModal>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import PostComposeModal, {
  type ComposeForm,
  type AiGenerated,
} from '../PostComposeModal.vue';
import ScreenshotPanel from './ScreenshotPanel.vue';
import { api } from '../../../lib/api.js';
import { dataUrlToBlob } from '../../../lib/metadata.js';
import { WEB_APP_URL } from '../../../lib/env.js';
import { safeSendMessage } from '../../../lib/extension.js';
import type { BrowserMeta } from '@deveprobe/shared';
import type { StoredAuth } from '../../../lib/auth.js';

const props = defineProps<{
  /** Cropped PNG data URL from the region selector. */
  screenshotDataUrl: string;
  /** Captured page metadata (URL, browser, viewport, etc.). */
  browserMeta:       BrowserMeta;
  /** Stored auth — null when the workspace isn't connected. */
  auth:              StoredAuth | null;
}>();

const emit = defineEmits<{
  close: [];
}>();

const panel       = ref<InstanceType<typeof ScreenshotPanel> | null>(null);
const submitting  = ref(false);
const submitError = ref('');

// ── Download (annotated PNG) ────────────────────────────────────────────────
// `getHref` is lazy so the modal exports the latest annotations every time
// the user clicks Download — not just whatever existed at mount.
const downloadConfig = {
  getHref:  () => panel.value?.exportPng() ?? props.screenshotDataUrl,
  filename: `screenshot-${Date.now()}.png`,
};

// ── AI generate (title + reproduction steps + tags) ─────────────────────────
// The modal applies the returned fields to the form via IssueComposePanel
// imperative API. Backend wiring is pending — stubbed so the UX flows.
async function aiGenerate(): Promise<AiGenerated> {
  await new Promise((r) => setTimeout(r, 1500));
  // TODO: call AI endpoint with { screenshotDataUrl, browserMeta }.
  return { title: '', summary: '', tags: [] };
}

// ── Helpers ─────────────────────────────────────────────────────────────────
async function openInTab(url: string) {
  // chrome.tabs is unavailable in content scripts — route via background.
  const sent = await safeSendMessage<{ ok: boolean }>({ type: 'OPEN_TAB', url });
  if (!sent) window.open(url, '_blank', 'noopener');
}

// ── Submit ──────────────────────────────────────────────────────────────────
async function onSubmit(form: ComposeForm) {
  if (submitting.value) return;
  submitError.value = '';

  // Guard: launcher should prevent reaching this modal without auth, but
  // double-check so the button never fakes a successful submit.
  if (!props.auth?.token) {
    submitError.value = 'Connect a workspace before submitting.';
    return;
  }

  submitting.value = true;
  try {
    const annotatedDataUrl =
      panel.value?.exportPng() ?? props.screenshotDataUrl;

    // No folder is sent — the API drops the issue in the workspace's root
    // inbox and the user organises it from the dashboard later. Capture
    // stays friction-free.
    const issue = await api.createIssue({
      source:      'extension',
      mode:        'screenshot',
      title:       form.title,
      summary:     form.summary || undefined,
      severity:    form.severity,
      visibility:  form.visibility,
      pageUrl:     props.browserMeta.pageUrl,
      browserMeta: props.browserMeta,
    });

    await api.uploadAttachment({
      blob:     dataUrlToBlob(annotatedDataUrl),
      filename: `screenshot-${issue.id}.png`,
      type:     'screenshot',
      issueId:  issue.id,
    });

    // Only redirect + close on confirmed success.
    await openInTab(`${WEB_APP_URL}/issue/${issue.id}`);
    emit('close');
  } catch (e) {
    submitError.value =
      (e as Error).message || 'Could not create the issue. Please try again.';
  } finally {
    submitting.value = false;
  }
}
</script>
