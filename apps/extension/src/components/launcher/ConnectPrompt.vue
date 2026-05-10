<!--
  ConnectPrompt
  ─────────────
  Reusable "connect your workspace" panel rendered when no auth is stored.
  Used by the popup (filling the body) and the floating launcher menu (replacing
  the action list). Provides a single button that opens /extension/connect with
  the runtime id pre-filled so the web app can auto-handoff in one click.
-->
<template>
  <div class="px-4 py-5 text-center">
    <div class="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
      <Icon name="link" :size="16" :stroke-width="2" />
    </div>
    <p class="text-[13px] font-semibold text-foreground">Connect a workspace</p>
    <p class="mt-1 text-[11px] leading-snug text-muted-foreground">
      DevProbe needs a workspace to save and route issues.
    </p>
    <Button
      variant="default"
      size="sm"
      class="mt-3 w-full justify-center text-[12px]"
      @click="openConnect"
    >
      Connect workspace
    </Button>
  </div>
</template>

<script setup lang="ts">
import Icon from '../base/Icon.vue';
import { Button } from '@deveprobe/ui';
import { WEB_APP_URL } from '../../lib/env.js';
import { isExtensionAlive, safeSendMessage } from '../../lib/extension.js';

async function openConnect() {
  if (!isExtensionAlive()) {
    // Reloaded extension — fall back to opening the URL directly without the ?ext=.
    window.open(`${WEB_APP_URL}/extension/connect`, '_blank', 'noopener');
    return;
  }
  const url = `${WEB_APP_URL}/extension/connect?ext=${chrome.runtime.id}`;
  const sent = await safeSendMessage<{ ok: boolean }>({ type: 'OPEN_TAB', url });
  if (!sent) window.open(url, '_blank', 'noopener');
}
</script>
