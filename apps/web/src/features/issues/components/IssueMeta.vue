<template>
  <dl class="grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
    <div>
      <dt class="text-[10px] uppercase tracking-wide text-muted-foreground/70">Source</dt>
      <dd class="font-mono">{{ issue.source }}</dd>
    </div>
    <div>
      <dt class="text-[10px] uppercase tracking-wide text-muted-foreground/70">Mode</dt>
      <dd class="font-mono">{{ issue.mode }}</dd>
    </div>
    <div v-if="issue.pageUrl" class="col-span-2">
      <dt class="text-[10px] uppercase tracking-wide text-muted-foreground/70">Page</dt>
      <dd>
        <a
          :href="issue.pageUrl"
          target="_blank"
          rel="noopener"
          class="font-mono text-primary hover:underline break-all"
        >
          {{ issue.pageUrl }}
        </a>
      </dd>
    </div>
    <div>
      <dt class="text-[10px] uppercase tracking-wide text-muted-foreground/70">Created</dt>
      <dd>{{ timeAgo(issue.createdAt) }}</dd>
    </div>
  </dl>
</template>

<script setup lang="ts">
import type { Issue } from "@deveprobe/shared";
import { timeAgo } from "@/shared/lib/format.js";

defineProps<{ issue: Issue }>();
</script>
