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

    <!-- Disconnected -->
    <ConnectPrompt v-else-if="!account.auth.value" />

    <!-- Connected -->
    <template v-else>
      <ActionList @screenshot="onScreenshot" />
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
import PopupHeader   from './components/PopupHeader.vue';
import ActionList    from './components/ActionList.vue';
import AccountMenu   from './components/AccountMenu.vue';
import ConnectPrompt from '../../components/launcher/ConnectPrompt.vue';
import { usePopupAccount } from './composables/usePopupAccount.js';
import { safeSendMessage } from '../../lib/extension.js';

const account = usePopupAccount();
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
</script>
