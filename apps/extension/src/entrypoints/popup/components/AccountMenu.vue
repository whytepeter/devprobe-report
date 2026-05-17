<!--
  AccountMenu
  ───────────
  Popup header dropdown. Shows the connected user + workspace, jumps to the
  dashboard, and disconnects. Folder organisation lives in the web app.
-->
<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <button
        type="button"
        :aria-label="auth ? 'Account menu' : 'Connect workspace'"
        class="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        :class="auth ? 'text-foreground hover:bg-muted' : 'text-primary hover:bg-muted'"
      >
        <span
          v-if="auth"
          class="h-1.5 w-1.5 rounded-full bg-emerald-500"
        />
        <span class="truncate max-w-[150px]">
          {{ auth ? (me?.name ?? 'Account') : 'Connect workspace' }}
        </span>
        <Icon name="chevron-down" :size="11" :stroke-width="2" class="shrink-0 text-muted-foreground" />
      </button>
    </DropdownMenuTrigger>

    <DropdownMenuContent align="end" side="bottom" class="w-64">
      <!-- Disconnected state -->
      <template v-if="!auth">
        <DropdownMenuLabel class="font-normal">
          <p class="text-[12px] font-medium text-foreground">No workspace connected</p>
          <p class="text-[11px] text-muted-foreground">Link DevProbe to a workspace to save and route issues.</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem @select="openConnect">
          <Icon name="link" :size="13" :stroke-width="1.75" class="mr-2" />
          Connect workspace
        </DropdownMenuItem>
      </template>

      <!-- Connected state -->
      <template v-else>
        <DropdownMenuLabel class="font-normal">
          <p class="text-[12px] font-medium text-foreground truncate">{{ me?.name ?? auth.userId ?? '—' }}</p>
          <p class="text-[11px] text-muted-foreground truncate">{{ me?.email ?? '' }}</p>
          <p v-if="me?.role" class="text-[10px] text-muted-foreground/80 mt-0.5 uppercase tracking-wide">
            {{ me.role }}
          </p>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem @select="openDashboard">
          <Icon name="external-link" :size="13" :stroke-width="1.75" class="mr-2" />
          Open dashboard
        </DropdownMenuItem>

        <DropdownMenuItem
          class="text-destructive focus:text-destructive"
          @select="onDisconnect"
        >
          <Icon name="log-out" :size="13" :stroke-width="1.75" class="mr-2" />
          Disconnect workspace
        </DropdownMenuItem>
      </template>
    </DropdownMenuContent>
  </DropdownMenu>
</template>

<script setup lang="ts">
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Icon,
} from '@deveprobe/ui';
import { WEB_APP_URL } from '../../../lib/env.js';
import { safeSendMessage } from '../../../lib/extension.js';
import type { Me } from '../../../lib/api.js';
import type { StoredAuth } from '../../../lib/auth.js';

defineProps<{
  auth: StoredAuth | null;
  me: Me | null;
  loading: boolean;
}>();

const emit = defineEmits<{
  disconnect: [];
}>();

function openTab(url: string) {
  safeSendMessage({ type: 'OPEN_TAB', url }).then((res) => {
    if (!res) window.open(url, '_blank', 'noopener');
  });
}

function openConnect() {
  openTab(`${WEB_APP_URL}/extension/connect?ext=${chrome.runtime.id}`);
}

function openDashboard() {
  openTab(`${WEB_APP_URL}/issues`);
}

function onDisconnect() {
  emit('disconnect');
}
</script>
