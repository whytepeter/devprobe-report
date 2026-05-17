<template>
  <div class="flex h-screen bg-background overflow-hidden font-sans">
    <!-- Sidebar -->
    <aside class="w-60 flex-shrink-0 border-r border-border flex flex-col bg-card">
      <!-- Brand -->
      <div class="h-12 flex items-center gap-2 px-3 border-b border-border">
        <span class="flex h-6 w-6 items-center justify-center rounded-md bg-primary shrink-0">
          <Icon name="hexagon" :size="12" color="#fff" :stroke-width="2.5" />
        </span>
        <span class="text-[13px] font-semibold text-foreground tracking-tight">DevProbe</span>
      </div>

      <!-- Workspace switcher -->
      <div class="border-b border-border">
        <WorkspaceSwitcher />
      </div>

      <!-- Nav -->
      <nav class="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        <RouterLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          activeClass="bg-muted text-foreground font-medium"
        >
          <Icon :name="item.icon" :size="14" :stroke-width="1.75" />
          <span class="flex-1">{{ item.label }}</span>
          <span
            v-if="item.count != null"
            class="font-mono text-[11px] text-muted-foreground"
          >
            {{ item.count }}
          </span>
        </RouterLink>

        <!-- Folders section -->
        <div class="pt-5">
          <div class="flex items-center justify-between px-3 pb-1.5">
            <span class="text-[10px] font-medium tracking-[0.06em] text-muted-foreground/70 lowercase">
              folders
            </span>
            <button
              type="button"
              class="text-muted-foreground hover:text-foreground transition-colors rounded-sm p-0.5 hover:bg-muted"
              title="New folder"
              aria-label="New folder"
              @click="creatingFolder = true"
            >
              <Icon name="plus" :size="12" :stroke-width="2" />
            </button>
          </div>

          <div v-if="foldersLoading" class="px-3 py-1.5 text-[12px] text-muted-foreground italic">
            Loading…
          </div>

          <p v-else-if="folders.length === 0" class="px-3 py-1.5 text-[12px] text-muted-foreground italic">
            No folders yet
          </p>

          <RouterLink
            v-for="folder in folders"
            v-else
            :key="folder.id"
            :to="`/folder/${folder.id}`"
            class="flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            activeClass="bg-muted text-foreground font-medium"
          >
            <Icon name="folder" :size="14" :stroke-width="1.75" :class="folderColor(folder.id)" />
            <span class="truncate">{{ folder.name }}</span>
          </RouterLink>
        </div>
      </nav>

      <!-- User menu -->
      <div class="border-t border-border p-2">
        <UserMenu />
      </div>
    </aside>

    <!-- Main -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <RouterView />
    </div>

    <CreateFolderDialog v-model:open="creatingFolder" :submit="createFolder" @created="onFolderCreated" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink, RouterView } from "vue-router";
import { Icon } from '@deveprobe/ui';
import { useAuthStore } from "@/features/auth/auth.store.js";
import UserMenu from "@/features/workspace-shell/components/UserMenu.vue";
import WorkspaceSwitcher from "@/features/workspace-shell/components/WorkspaceSwitcher.vue";
import { useFolders } from "@/features/folders/composables/useFolders.js";
import { folderColor } from "@/features/folders/utils/color.js";
import CreateFolderDialog from "@/features/folders/components/CreateFolderDialog.vue";
import { useIssues } from "@/features/dashboard/composables/useIssues.js";

const auth = useAuthStore();
const { folders, loading: foldersLoading, load: loadFolders, create: createFolder } = useFolders();
const { issues, load: loadIssues } = useIssues();
const creatingFolder = ref(false);

onMounted(async () => {
  if (!auth.isAuthenticated) return;
  // fetchWorkspaces is here in addition to hydrate() because persisted
  // `hydrated: true` from a prior session would short-circuit the hydrate path
  // before the workspace endpoint existed.
  await Promise.all([loadFolders(), loadIssues(), auth.fetchWorkspaces()]);
});

const issueCount = computed(() => issues.value.length);

const nav = computed(() => [
  { to: "/issues",       label: "Issues",       icon: "inbox",    count: issueCount.value },
  { to: "/settings",     label: "Settings",     icon: "settings", count: null as number | null },
  { to: "/integrations", label: "Integrations", icon: "link",     count: null as number | null },
]);

async function onFolderCreated() {
  await loadFolders();
}
</script>
