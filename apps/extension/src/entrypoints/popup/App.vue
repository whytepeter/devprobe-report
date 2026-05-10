<!--
  Extension popup — launcher only.
  Capture actions are gated behind a connected workspace. Without auth, the
  popup shows a single connect prompt; with auth, the action list.
  On screenshot: sends START_REGION_SELECT to the content script, then closes.
-->
<template>
  <div class="w-[360px] bg-card text-foreground">
    <PopupHeader :connected="!!auth" :connect-url="connectUrl" />

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

    <!-- Disconnected: prompt user to connect -->
    <ConnectPrompt v-else-if="!auth" />

    <!-- Connected: capture actions -->
    <ActionList v-else @screenshot="onScreenshot" />

    <!-- Footer URL -->
    <div v-if="currentUrl && !launching" class="px-4 py-2 border-t border-border">
      <span class="text-[11px] text-muted-foreground font-mono truncate block">{{ currentUrl }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import PopupHeader   from './components/PopupHeader.vue';
import ActionList    from './components/ActionList.vue';
import ConnectPrompt from '../../components/launcher/ConnectPrompt.vue';
import { Button }    from '@deveprobe/ui';
import { getAuth, onAuthChange, type StoredAuth } from '../../lib/auth.js';
import { WEB_APP_URL } from '../../lib/env.js';

const auth        = ref<StoredAuth | null>(null);
const currentUrl  = ref('');
const launching   = ref(false);
const launchError = ref('');

// Pre-fill the extension id so the connect page can auto-handoff in one click.
const connectUrl = `${WEB_APP_URL}/extension/connect?ext=${chrome.runtime.id}`;

let unsubscribeAuth: (() => void) | null = null;

onMounted(async () => {
  auth.value = await getAuth();
  unsubscribeAuth = onAuthChange((next) => { auth.value = next; });
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

onUnmounted(() => { unsubscribeAuth?.(); });

async function onScreenshot() {
  launchError.value = '';
  launching.value   = true;
  try {
    const res = await chrome.runtime.sendMessage({
      type:    'FORWARD_TO_CONTENT',
      payload: { type: 'START_REGION_SELECT', auth: auth.value },
    });
    if (!res?.ok) throw new Error(res?.error ?? 'Could not start capture');
    window.close();
  } catch (e) {
    launchError.value = (e as Error).message;
    launching.value   = false;
  }
}
</script>
