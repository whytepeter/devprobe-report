<!--
  AccountMenu
  ───────────
  Popup header dropdown. Shows the connected user + workspace, lets the user
  switch the active project, jump to the dashboard, and disconnect.
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

        <DropdownMenuLabel class="text-[10px] uppercase tracking-[0.07em] text-muted-foreground/70 font-semibold">
          Active project
        </DropdownMenuLabel>

        <div v-if="loading" class="px-2 py-1.5 text-[11px] text-muted-foreground italic">
          Loading…
        </div>

        <div v-else-if="projects.length === 0" class="px-2 pb-1.5 space-y-1.5">
          <p class="text-[11px] text-muted-foreground leading-snug">
            No projects in this workspace yet.
          </p>
          <button
            type="button"
            class="text-[11px] font-medium text-primary hover:underline inline-flex items-center gap-1"
            @click="openProjects"
          >
            Create one
            <Icon name="arrow-up-right" :size="10" :stroke-width="2" />
          </button>
        </div>

        <DropdownMenuItem
          v-for="p in projects"
          v-else
          :key="p.id"
          class="gap-2"
          @select="onSelectProject(p.id)"
        >
          <Icon
            :name="p.id === activeProjectId ? 'check' : 'circle'"
            :size="13"
            :stroke-width="2"
            :class="p.id === activeProjectId ? 'text-primary' : 'text-muted-foreground/40'"
          />
          <span class="flex-1 truncate">{{ p.name }}</span>
          <span class="font-mono text-[10px] text-muted-foreground shrink-0">{{ p.slug }}</span>
        </DropdownMenuItem>

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
import type { Project } from '@deveprobe/shared';

const props = defineProps<{
  auth: StoredAuth | null;
  me: Me | null;
  projects: Project[];
  loading: boolean;
  activeProjectId: string | null;
}>();

const emit = defineEmits<{
  select: [projectId: string];
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
  openTab(`${WEB_APP_URL}/dashboard`);
}

function openProjects() {
  openTab(`${WEB_APP_URL}/projects`);
}

function onSelectProject(projectId: string) {
  if (projectId === props.activeProjectId) return;
  emit('select', projectId);
}

function onDisconnect() {
  emit('disconnect');
}
</script>
