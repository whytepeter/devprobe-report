<template>
  <div class="flex h-screen bg-background overflow-hidden">
    <!-- Sidebar — 16rem matches shadcn sidebar width convention -->
    <aside class="w-64 flex-shrink-0 border-r border-border flex flex-col bg-card">
      <!-- Logo -->
      <div class="h-12 flex items-center gap-2.5 px-4 border-b border-border">
        <span class="flex h-6 w-6 items-center justify-center rounded-md bg-primary shrink-0">
          <Icon name="hexagon" :size="12" color="#fff" :stroke-width="2.5" />
        </span>
        <span class="text-[13px] font-semibold text-foreground tracking-tight">DevProbe</span>
      </div>

      <!-- Nav -->
      <nav class="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
        <RouterLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          activeClass="bg-muted text-foreground font-medium"
        >
          <Icon :name="item.icon" :size="15" :stroke-width="1.5" />
          {{ item.label }}
        </RouterLink>
      </nav>

      <!-- User row -->
      <div class="border-t border-border px-3 py-3 flex items-center gap-2">
        <div class="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[11px] font-semibold text-foreground shrink-0">
          {{ userInitial }}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-[12px] font-medium text-foreground truncate">{{ auth.userName ?? "—" }}</p>
          <p class="text-[11px] text-muted-foreground truncate">{{ auth.userRole ?? "member" }}</p>
        </div>
        <Button variant="ghost" size="icon-sm" :title="theme === 'dark' ? 'Light mode' : 'Dark mode'" @click="toggle">
          <Icon :name="theme === 'dark' ? 'sun' : 'moon'" :size="13" :stroke-width="1.5" />
        </Button>
        <Button variant="ghost" size="icon-sm" title="Sign out" @click="auth.logout(); $router.push('/login')">
          <Icon name="log-out" :size="13" :stroke-width="1.5" />
        </Button>
      </div>
    </aside>

    <!-- Main -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <RouterView />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, RouterView } from "vue-router";
import { useAuthStore } from "@/stores/auth.js";
import { useTheme } from "@/composables/useTheme.js";
import Icon from "@/components/base/Icon.vue";
import { Button } from "@deveprobe/ui";

const auth = useAuthStore();
const { theme, toggle } = useTheme();

const userInitial = computed(() =>
  auth.userName ? auth.userName[0]!.toUpperCase() : "?"
);

const nav = [
  { to: "/dashboard", label: "Inbox",    icon: "layout-dashboard" },
  { to: "/projects",  label: "Projects", icon: "folder-open" },
  { to: "/settings",  label: "Settings", icon: "settings" },
];
</script>
