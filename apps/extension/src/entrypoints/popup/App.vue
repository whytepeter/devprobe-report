<!--
  Extension popup
  ───────────────
  Capture actions are gated behind a connected workspace. Without auth the
  popup shows a single connect prompt; with auth, the action list. Folder
  organisation happens in the web dashboard, not here — capture is one click.

  The right side of the header hosts an AccountMenu (user identity, dashboard
  link, disconnect).
-->
<template>
  <div class="w-[360px] bg-card text-foreground font-sans">
    <PopupHeader>
      <template #menu>
        <AccountMenu
          :auth="account.auth.value"
          :me="account.me.value"
          :loading="account.loading.value"
          @disconnect="account.disconnect"
        />
      </template>
    </PopupHeader>

    <!-- Pending -->
    <div v-if="launching" class="px-5 py-10 text-center space-y-2">
      <div class="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
      <p class="text-xs text-muted-foreground">Opening capture tool…</p>
    </div>

    <!-- Error -->
    <div v-else-if="launchError" class="px-4 py-4 space-y-3">
      <p class="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{{ launchError }}</p>
      <Button variant="ghost" size="sm" @click="launchError = ''">Dismiss</Button>
    </div>

    <!-- Initial paint placeholder (one frame, prevents Connect ↔ Action flicker
         while we read auth from chrome.storage). -->
    <div v-else-if="!account.initialised.value" class="px-5 py-10" aria-hidden="true">
      <div class="h-3 w-1/3 rounded bg-muted animate-pulse" />
      <div class="mt-3 h-2 w-1/2 rounded bg-muted animate-pulse" />
    </div>

    <!-- Disconnected -->
    <ConnectPrompt v-else-if="!account.auth.value" />

    <!-- Recording in progress -->
    <RecordingActiveView
      v-else-if="recording.state.value"
      :elapsed-ms="recording.elapsedMs.value"
      :page-url="recording.state.value.pageUrl"
      @stop="onStopRecording"
    />

    <!-- Connected -->
    <template v-else>
      <ActionList @screenshot="onScreenshot" @record="onRecord" @annotate="onAnnotate" />
    </template>

    <!-- Footer URL -->
    <div v-if="currentUrl && !launching" class="px-4 py-2 border-t border-border">
      <span class="text-[11px] text-muted-foreground font-mono truncate block">{{ currentUrl }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Button } from '@deveprobe/ui';
import PopupHeader        from './components/PopupHeader.vue';
import ActionList         from './components/ActionList.vue';
import AccountMenu        from './components/AccountMenu.vue';
import RecordingActiveView from './components/RecordingActiveView.vue';
import ConnectPrompt from '../../components/launcher/ConnectPrompt.vue';
import { usePopupAccount }    from './composables/usePopupAccount.js';
import { useRecordingStatus } from './composables/useRecordingStatus.js';
import { safeSendMessage } from '../../lib/extension.js';

const account   = usePopupAccount();
const recording = useRecordingStatus();
const currentUrl  = ref('');
const launching   = ref(false);
const launchError = ref('');

onMounted(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url) {
    try {
      const u = new URL(tab.url);
      currentUrl.value = u.hostname + u.pathname;
    } catch {
      currentUrl.value = tab.url;
    }
  }
});

async function onScreenshot() {
  launchError.value = '';
  launching.value   = true;
  try {
    const res = await safeSendMessage<{ ok?: boolean; error?: string }>({
      type:    'FORWARD_TO_CONTENT',
      payload: { type: 'START_REGION_SELECT', auth: account.auth.value },
    });
    if (!res?.ok) throw new Error(res?.error ?? 'Could not start capture');
    window.close();
  } catch (e) {
    launchError.value = (e as Error).message;
    launching.value   = false;
  }
}

async function onRecord() {
  launchError.value = '';
  launching.value   = true;
  try {
    const res = await safeSendMessage<{ ok?: boolean; error?: string }>({
      type: 'START_RECORDING_FLOW',
    });
    if (!res?.ok) throw new Error(res?.error ?? 'Could not start recording');
    window.close();
  } catch (e) {
    launchError.value = (e as Error).message;
    launching.value   = false;
  }
}

async function onAnnotate() {
  // Annotation mounts in the active tab's content script — same FORWARD_TO_CONTENT
  // pattern as Screenshot. Background pings the tab; if no content script is
  // listening yet (extension just installed / first nav), it injects the
  // content bundle then delivers the payload.
  launchError.value = '';
  launching.value   = true;
  try {
    const res = await safeSendMessage<{ ok?: boolean; error?: string }>({
      type:    'FORWARD_TO_CONTENT',
      payload: { type: 'START_ANNOTATION' },
    });
    if (!res?.ok) throw new Error(res?.error ?? 'Could not start annotation');
    window.close();
  } catch (e) {
    launchError.value = (e as Error).message;
    launching.value   = false;
  }
}

async function onStopRecording() {
  try {
    await safeSendMessage<{ ok?: boolean }>({
      type:    'RECORDING_COMMAND',
      command: 'stop',
    });
    window.close();
  } catch (e) {
    launchError.value = (e as Error).message;
  }
}
</script>
