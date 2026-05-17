<template>
  <tr
    class="group flex items-center gap-3 px-6 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
    @click="$router.push(`/issue/${issue.id}`)"
  >
    <td class="flex-shrink-0 w-5 flex items-center justify-center">
      <ModeIcon :mode="issue.mode" />
    </td>

    <td class="flex-1 min-w-0">
      <p class="text-sm text-foreground truncate">{{ issue.title }}</p>
      <div class="flex items-center gap-2 mt-0.5">
        <span class="font-mono text-[10px] text-muted-foreground truncate max-w-[180px]">{{ issue.id }}</span>
        <span
          v-if="issue.pageUrl"
          class="text-[10px] text-muted-foreground truncate max-w-[220px]"
        >
          {{ hostOf(issue.pageUrl) }}
        </span>
      </div>
    </td>

    <td class="flex-shrink-0 w-20 flex justify-end">
      <SeverityChip :severity="issue.severity" />
    </td>

    <td class="flex-shrink-0 w-28 flex justify-end">
      <StatusChip :status="issue.status" />
    </td>

    <td class="flex-shrink-0 w-16 text-right">
      <span class="text-xs text-muted-foreground">{{ timeAgo(issue.createdAt) }}</span>
    </td>
  </tr>
</template>

<script setup lang="ts">
import type { Issue } from "@deveprobe/shared";
import SeverityChip from "@/features/issues/components/SeverityChip.vue";
import StatusChip from "@/features/issues/components/StatusChip.vue";
import ModeIcon from "@/features/issues/components/ModeIcon.vue";
import { timeAgo } from "@/shared/lib/format.js";
import { hostOf } from "@/features/dashboard/utils/host.js";

defineProps<{ issue: Issue }>();
</script>
