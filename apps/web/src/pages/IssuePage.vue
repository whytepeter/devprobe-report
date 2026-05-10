<template>
  <div class="flex-1 flex flex-col overflow-hidden">
    <header class="h-12 flex items-center gap-3 px-5 border-b border-border flex-shrink-0 bg-background">
      <Button variant="ghost" size="icon-sm" class="shrink-0" as-child>
        <RouterLink to="/dashboard">
          <Icon name="arrow-left" :size="16" :stroke-width="1.5" />
        </RouterLink>
      </Button>
      <span class="text-sm text-muted-foreground font-mono truncate">{{ issueId }}</span>
      <span v-if="issue" class="ml-auto flex items-center gap-2">
        <SeverityChip :severity="issue.severity" />
        <StatusChip :status="issue.status" />
      </span>
    </header>

    <div class="flex-1 overflow-auto">
      <!-- Loading -->
      <div v-if="loading" class="h-full flex items-center justify-center text-muted-foreground text-sm">
        Loading issue…
      </div>

      <!-- Auth required -->
      <div v-else-if="error === 'unauthorized'" class="h-full flex items-center justify-center px-6">
        <div class="max-w-sm text-center space-y-3">
          <Icon name="lock" :size="28" :stroke-width="1.5" class="mx-auto text-muted-foreground" />
          <p class="text-sm font-medium">Sign in to view this issue</p>
          <p class="text-xs text-muted-foreground">
            Issues are scoped to your workspace. Sign in with the account that owns it.
          </p>
          <Button size="sm" as-child>
            <RouterLink :to="`/login?redirect=/issue/${issueId}`">Sign in</RouterLink>
          </Button>
        </div>
      </div>

      <!-- Not found -->
      <div v-else-if="error === 'not-found'" class="h-full flex items-center justify-center px-6">
        <div class="max-w-sm text-center space-y-3">
          <Icon name="search-x" :size="28" :stroke-width="1.5" class="mx-auto text-muted-foreground" />
          <p class="text-sm font-medium">Issue not found</p>
          <p class="text-xs text-muted-foreground">
            This id doesn't belong to any issue in your workspace. If the extension created it without a connected
            workspace, it was never persisted — connect the extension and try again.
          </p>
          <Button size="sm" variant="outline" as-child>
            <RouterLink to="/extension/connect">Connect the extension</RouterLink>
          </Button>
        </div>
      </div>

      <!-- Generic error -->
      <div v-else-if="error" class="h-full flex items-center justify-center text-sm text-destructive">
        {{ errorMessage }}
      </div>

      <!-- Issue body -->
      <div v-else-if="issue" class="max-w-3xl mx-auto p-6 space-y-6">
        <h1 class="text-xl font-semibold leading-tight">{{ issue.title }}</h1>

        <p v-if="issue.summary" class="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
          {{ issue.summary }}
        </p>
        <p v-else class="text-xs text-muted-foreground italic">No description provided.</p>

        <div class="grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
          <div>
            <p class="text-[10px] uppercase tracking-wide text-muted-foreground/70">Source</p>
            <p class="font-mono">{{ issue.source }}</p>
          </div>
          <div>
            <p class="text-[10px] uppercase tracking-wide text-muted-foreground/70">Mode</p>
            <p class="font-mono">{{ issue.mode }}</p>
          </div>
          <div v-if="issue.pageUrl" class="col-span-2">
            <p class="text-[10px] uppercase tracking-wide text-muted-foreground/70">Page</p>
            <a :href="issue.pageUrl" target="_blank" rel="noopener" class="font-mono text-primary hover:underline break-all">
              {{ issue.pageUrl }}
            </a>
          </div>
          <div>
            <p class="text-[10px] uppercase tracking-wide text-muted-foreground/70">Created</p>
            <p>{{ timeAgo(issue.createdAt) }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { Button } from "@deveprobe/ui";
import Icon from "@/components/base/Icon.vue";
import SeverityChip from "@/components/SeverityChip.vue";
import StatusChip from "@/components/StatusChip.vue";
import { api } from "@/lib/api.js";
import { timeAgo } from "@/lib/format.js";
import { useAuthStore } from "@/stores/auth.js";
import type { Issue } from "@deveprobe/shared";

const route = useRoute();
const auth = useAuthStore();
const issueId = computed(() => route.params["id"]?.toString() ?? "");

const loading = ref(false);
const issue = ref<Issue | null>(null);
type LoadError = "unauthorized" | "not-found" | "network" | null;
const error = ref<LoadError>(null);
const errorMessage = ref("Couldn't load this issue.");

async function load() {
  if (!issueId.value) return;
  loading.value = true;
  issue.value = null;
  error.value = null;

  // Short-circuit before the api interceptor auto-redirects on 401.
  if (!auth.isAuthenticated) {
    error.value = "unauthorized";
    loading.value = false;
    return;
  }

  try {
    const res = await api.get(`/issues/${issueId.value}`);
    issue.value = res.data.data as Issue;
  } catch (e) {
    const status = (e as { response?: { status?: number } }).response?.status;
    if (status === 404) error.value = "not-found";
    else if (status === 401) error.value = "unauthorized";
    else {
      error.value = "network";
      errorMessage.value = (e as Error).message;
    }
  } finally {
    loading.value = false;
  }
}

watch(issueId, load, { immediate: true });
</script>
