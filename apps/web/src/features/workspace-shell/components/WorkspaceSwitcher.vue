<!--
  WorkspaceSwitcher
  ─────────────────
  Sidebar header: current workspace avatar + name with a switch icon on the
  right. The whole row opens a dropdown that lists every workspace the user
  belongs to and exposes "+ Add workspace".
-->
<template>
  <div class="flex items-center gap-2 px-2.5 py-2">
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <button
          type="button"
          class="flex flex-1 items-center gap-2.5 min-w-0 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          :aria-label="auth.currentWorkspace?.name ?? 'Workspace'"
        >
          <Avatar class="h-8 w-8 shrink-0">
            <AvatarFallback
              :class="[
                'text-[12px] font-semibold text-white',
                workspaceBg(auth.currentWorkspace?.id ?? auth.orgId ?? 'x'),
              ]"
            >
              {{ initial }}
            </AvatarFallback>
          </Avatar>
          <div class="flex-1 min-w-0">
            <p class="text-[13px] font-semibold text-foreground truncate">
              {{ auth.currentWorkspace?.name ?? "Workspace" }}
            </p>
          </div>
          <Icon name="arrow-right-left" :size="13" :stroke-width="1.75" class="text-muted-foreground shrink-0" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" side="bottom" class="w-60">
        <DropdownMenuLabel class="text-[10px] uppercase tracking-[0.07em] text-muted-foreground/70 font-semibold">
          Workspaces
        </DropdownMenuLabel>

        <DropdownMenuItem
          v-for="w in auth.workspaces"
          :key="w.id"
          class="gap-2.5"
          @select="onSelect(w.id)"
        >
          <Avatar class="h-6 w-6 shrink-0">
            <AvatarFallback :class="['text-[10px] font-semibold text-white', workspaceBg(w.id)]">
              {{ workspaceInitial(w.name) }}
            </AvatarFallback>
          </Avatar>
          <span class="flex-1 truncate text-[12px]">{{ w.name }}</span>
          <Icon
            v-if="w.id === auth.orgId"
            name="check"
            :size="12"
            :stroke-width="2"
            class="text-primary shrink-0"
          />
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem class="gap-2" @select="opened = true">
          <Icon name="plus" :size="13" :stroke-width="1.75" class="text-muted-foreground" />
          <span class="text-[12px]">Add workspace</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>

  <CreateWorkspaceDialog v-model:open="opened" @created="onCreated" />
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import {
  Avatar,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Icon,
} from "@deveprobe/ui";
import { useAuthStore } from "@/features/auth/auth.store.js";
import { workspaceBg } from "@/features/folders/utils/color.js";
import CreateWorkspaceDialog from "@/features/workspace-shell/components/CreateWorkspaceDialog.vue";

const auth = useAuthStore();
const opened = ref(false);

const initial = computed(() => {
  const name = auth.currentWorkspace?.name ?? auth.userName ?? "?";
  return name[0]?.toUpperCase() ?? "?";
});

function workspaceInitial(name: string) {
  return name[0]?.toUpperCase() ?? "?";
}

async function onSelect(targetOrgId: string) {
  if (targetOrgId === auth.orgId) return;
  await auth.switchWorkspace(targetOrgId);
  // Reload the current route so feature data (folders, issues) refetches for the new workspace scope.
  window.location.reload();
}

function onCreated() {
  // The store already updated token + workspace list; reload for clean scope.
  window.location.reload();
}
</script>
