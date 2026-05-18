<!--
  RecordingCapture
  ────────────────
  Orchestrates the recording compose flow.
  Plugs RecordingPanel into PostComposeModal's #media slot and handles the API
  submit. On success the new issue page is opened in a new tab and the modal
  closes.

  Props:
    videoBlobUrl  — object URL created from MediaRecorder chunks
    durationMs    — total recording duration in milliseconds
    markers       — timeline events detected during recording (errors, network, etc.)
    browserMeta   — page URL, browser info, viewport, etc.
    auth          — stored auth (token + orgId); may be null if not connected
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
      <RecordingPanel
        :video-src="props.videoBlobUrl"
        :duration-ms="props.durationMs"
        :markers="props.markers"
        :page-url="props.browserMeta?.pageUrl"
        :avg-response-ms="avgResponseMs"
      />
    </template>
  </PostComposeModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import PostComposeModal, { type ComposeForm } from '../PostComposeModal.vue';
import RecordingPanel from './RecordingPanel.vue';
import { api } from '../../../lib/api.js';
import { WEB_APP_URL } from '../../../lib/env.js';
import { safeSendMessage } from '../../../lib/extension.js';
import type { BrowserMeta } from '@deveprobe/shared';
import type { StoredAuth } from '../../../lib/auth.js';
import type { RecordingMarker } from './types.js';

const props = defineProps<{
  videoBlobUrl: string;
  durationMs:   number;
  markers?:     RecordingMarker[];
  browserMeta:  BrowserMeta;
  auth:         StoredAuth | null;
}>();

const emit = defineEmits<{
  close: [];
}>();

const submitting  = ref(false);
const submitError = ref('');

// Derive avg response time from slow/failed network markers for the panel stat.
const avgResponseMs = computed(() => {
  const slow = (props.markers ?? []).filter(
    m => m.type === 'network_slow' || m.type === 'network_fail',
  );
  return slow.length > 0 ? slow.length * 1000 : undefined;
});

async function openInTab(url: string) {
  const sent = await safeSendMessage<{ ok: boolean }>({ type: 'OPEN_TAB', url });
  if (!sent) window.open(url, '_blank', 'noopener');
}

async function onSubmit(form: ComposeForm) {
  if (submitting.value) return;
  submitError.value = '';

  if (!props.auth?.token) {
    submitError.value = 'Connect a workspace before submitting.';
    return;
  }
  submitting.value = true;
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

    // Fetch the blob from the object URL and upload as WebM.
    const res  = await fetch(props.videoBlobUrl);
    const blob = await res.blob();
    await api.uploadAttachment({
      blob,
      filename: `recording-${issue.id}.webm`,
      type:     'video',
      issueId:  issue.id,
    });

    await openInTab(`${WEB_APP_URL}/issue/${issue.id}`);
    emit('close');
  } catch (e) {
    submitError.value = (e as Error).message || 'Could not create the issue. Please try again.';
  } finally {
    submitting.value = false;
  }
}

</script>
