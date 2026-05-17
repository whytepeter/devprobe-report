<!--
  UserMenu
  ────────
  Sidebar footer: avatar + name + role, click opens a dropdown with
  theme toggle and sign out. Built on shadcn DropdownMenu + Avatar.
-->
<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <button
        class="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Avatar class="h-7 w-7">
          <AvatarFallback class="text-[11px] font-semibold bg-secondary text-foreground">
            {{ initial }}
          </AvatarFallback>
        </Avatar>
        <div class="flex-1 min-w-0">
          <p class="text-[12px] font-medium text-foreground truncate">
            {{ auth.userName ?? "—" }}
          </p>
          <p class="text-[11px] text-muted-foreground truncate">
            {{ auth.userRole ?? "member" }}
          </p>
        </div>
        <Icon name="chevrons-up-down" :size="12" class="text-muted-foreground shrink-0" />
      </button>
    </DropdownMenuTrigger>

    <DropdownMenuContent align="end" side="top" class="w-56">
      <DropdownMenuLabel class="font-normal">
        <p class="text-[12px] font-medium text-foreground truncate">
          {{ auth.userName ?? "—" }}
        </p>
        <p class="text-[11px] text-muted-foreground truncate">
          {{ auth.userEmail ?? "" }}
        </p>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem @select="$router.push('/settings')">
        <Icon name="settings" :size="14" :stroke-width="1.5" class="mr-2" />
        Settings
      </DropdownMenuItem>
      <DropdownMenuItem @select="toggle">
        <Icon
          :name="theme === 'dark' ? 'sun' : 'moon'"
          :size="14"
          :stroke-width="1.5"
          class="mr-2"
        />
        {{ theme === "dark" ? "Light mode" : "Dark mode" }}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem class="text-destructive focus:text-destructive" @select="signOut">
        <Icon name="log-out" :size="14" :stroke-width="1.5" class="mr-2" />
        Sign out
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { Avatar, AvatarFallback, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Icon } from "@deveprobe/ui";
import { useAuthStore } from "@/features/auth/auth.store.js";
import { useTheme } from "@/shared/composables/useTheme.js";

const auth = useAuthStore();
const router = useRouter();
const { theme, toggle } = useTheme();

const initial = computed(() => (auth.userName ? auth.userName[0]!.toUpperCase() : "?"));

function signOut() {
  auth.logout();
  router.push("/login");
}
</script>
