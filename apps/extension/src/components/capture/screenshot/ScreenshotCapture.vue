<!--
  ScreenshotCapture
  ─────────────────
  Orchestrates the screenshot compose flow.
  Plugs ScreenshotPanel into the headless PostComposeModal's #media slot and
  handles the API submit. On success the new issue page is opened in a new tab
  and the modal closes — there is no in-modal success state.

  Props:
    screenshotDataUrl — the cropped PNG captured from the region selector
    browserMeta       — page URL, browser info, viewport, etc.
    auth              — stored auth (token + orgId); may be null if not connected
-->
<template>
  <PostComposeModal
    :submitting="submitting"
    :error="submitError"
    :page-url="props.browserMeta?.pageUrl"
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
import PostComposeModal, { type ComposeForm } from '../PostComposeModal.vue';
import ScreenshotPanel from './ScreenshotPanel.vue';
import { api } from '../../../lib/api.js';
import { dataUrlToBlob } from '../../../lib/metadata.js';
import { WEB_APP_URL } from '../../../lib/env.js';
import { safeSendMessage } from '../../../lib/extension.js';
import type { BrowserMeta } from '@deveprobe/shared';
import type { StoredAuth } from '../../../lib/auth.js';

const props = defineProps<{
  screenshotDataUrl: string;
  browserMeta:       BrowserMeta;
  auth:              StoredAuth | null;
}>();

const emit = defineEmits<{
  close:   [];
  another: [];
}>();

const panel       = ref<InstanceType<typeof ScreenshotPanel> | null>(null);
const submitting  = ref(false);
const submitError = ref('');

async function openInTab(url: string) {
  // chrome.tabs is unavailable in content scripts — route via background.
  const sent = await safeSendMessage<{ ok: boolean }>({ type: 'OPEN_TAB', url });
  if (!sent) window.open(url, '_blank', 'noopener');
}

async function onSubmit(form: ComposeForm) {
  if (submitting.value) return;
  submitError.value = '';

  // Guard: this modal can only be reached from the connected launcher, but
  // double-check so the button never fakes a successful submit.
  if (!props.auth?.token) {
    submitError.value = 'Connect a workspace before submitting.';
    return;
  }
  if (!form.projectId) {
    submitError.value = 'Pick a project to submit this issue to.';
    return;
  }

  submitting.value = true;
  try {
    const annotatedDataUrl = panel.value?.exportPng() ?? props.screenshotDataUrl;

    const issue = await api.createIssue({
      projectId:   form.projectId,
      source:      'extension',
      mode:        'screenshot',
      title:       form.title,
      summary:     form.summary || undefined,
      severity:    form.severity,
      visibility:  form.visibility,
      pageUrl:     props.browserMeta.pageUrl,
      browserMeta: props.browserMeta,
    });

    const blob = dataUrlToBlob(annotatedDataUrl);
    await api.uploadAttachment({
      blob,
      filename: `screenshot-${issue.id}.png`,
      type:     'screenshot',
      issueId:  issue.id,
    });

    // Only redirect + close on confirmed success.
    await openInTab(`${WEB_APP_URL}/issue/${issue.id}`);
    emit('close');
  } catch (e) {
    submitError.value = (e as Error).message || 'Could not create the issue. Please try again.';
  } finally {
    submitting.value = false;
  }
}
</script>
