<template>
  <div class="flex h-screen bg-background overflow-hidden font-sans">
    <!-- Sidebar -->
    <aside class="w-60 flex-shrink-0 border-r border-border flex flex-col bg-card">
      <!-- Brand -->
      <div class="h-14 flex items-center gap-2.5 px-4 border-b border-border">
        <span class="flex h-7 w-7 items-center justify-center rounded-md bg-primary shrink-0">
          <Icon name="hexagon" :size="14" color="#fff" :stroke-width="2.5" />
        </span>
        <div class="flex-1 min-w-0">
          <p class="text-[13px] font-semibold text-foreground tracking-tight truncate">
            DevProbe
          </p>
          <p class="text-[11px] text-muted-foreground truncate">
            {{ auth.userRole ? `${auth.userRole} workspace` : "workspace" }}
          </p>
        </div>
      </div>

      <!-- Nav -->
      <nav class="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        <p class="px-3 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.07em] text-muted-foreground/70">
          Workspace
        </p>
        <RouterLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          activeClass="bg-muted text-foreground font-medium"
        >
          <Icon :name="item.icon" :size="14" :stroke-width="1.75" />
          {{ item.label }}
        </RouterLink>
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
  </div>
</template>

<script setup lang="ts">
import { RouterLink, RouterView } from "vue-router";
import { Icon } from '@deveprobe/ui';
import { useAuthStore } from "@/features/auth/auth.store.js";
import UserMenu from "@/features/workspace-shell/components/UserMenu.vue";

const auth = useAuthStore();

const nav = [
  { to: "/dashboard", label: "Issues", icon: "layout-grid" },
  { to: "/projects", label: "Projects", icon: "folder-open" },
  { to: "/settings", label: "Settings", icon: "settings" },
];
</script>
