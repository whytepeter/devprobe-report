<template>
  <div class="flex-1 flex flex-col overflow-hidden">
    <!-- Top bar -->
    <header
      class="h-12 flex items-center justify-between px-5 border-b border-border flex-shrink-0 bg-background"
    >
      <div class="flex items-center gap-3">
        <h2 class="text-md font-medium text-foreground">Inbox</h2>
        <span class="font-mono text-xs text-muted-foreground">{{
          filtered.length
        }}</span>
      </div>
      <Button variant="default" size="sm" class="gap-1.5 text-xs">
        <Icon name="plus" :size="14" :stroke-width="2" />
        New issue
      </Button>
    </header>

    <!-- Filters bar -->
    <div
      class="px-5 h-11 flex items-center gap-2.5 border-b border-border flex-shrink-0 bg-muted/40"
    >
      <!-- Search -->
      <div class="relative">
        <Icon
          name="search"
          :size="12"
          class="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          :stroke-width="2"
        />
        <Input
          v-model="q"
          class="pl-7 h-8 text-xs w-52 bg-background"
          placeholder="Search issues…"
        />
      </div>

      <div class="w-px h-4 bg-border" />

      <!-- Status filter -->
      <div class="flex items-center gap-1">
        <button
          v-for="s in statusOptions"
          :key="s.value"
          @click="toggleStatus(s.value)"
          :class="[
            'px-2.5 py-1 rounded text-xs transition-colors whitespace-nowrap',
            statusFilter === s.value
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted',
          ]"
        >
          {{ s.label }}
        </button>
      </div>

      <div class="w-px h-4 bg-border" />

      <!-- Severity filter -->
      <select
        v-model="severityFilter"
        class="h-8 w-auto max-w-[12rem] rounded-md border-0 bg-transparent py-0 pl-0 pr-1 text-xs text-secondary-foreground shadow-none outline-none transition-colors focus:ring-2 focus:ring-ring focus:ring-offset-0 cursor-pointer"
      >
        <option value="">All severities</option>
        <option value="critical">Critical</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>

      <!-- Mode filter -->
      <select
        v-model="modeFilter"
        class="h-8 w-auto max-w-[12rem] rounded-md border-0 bg-transparent py-0 pl-0 pr-1 text-xs text-secondary-foreground shadow-none outline-none transition-colors focus:ring-2 focus:ring-ring focus:ring-offset-0 cursor-pointer"
      >
        <option value="">All types</option>
        <option value="screen_recording">Recording</option>
        <option value="live_annotation">Annotation</option>
        <option value="screenshot">Screenshot</option>
      </select>

      <!-- Clear -->
      <button
        v-if="hasFilters"
        @click="clearFilters"
        class="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
      >
        <Icon name="x" :size="12" :stroke-width="2" />
        Clear
      </button>
    </div>

    <!-- Issue list -->
    <div class="flex-1 overflow-y-auto">
      <!-- Empty state -->
      <div
        v-if="filtered.length === 0"
        class="flex flex-col items-center justify-center h-full text-center py-24"
      >
        <Icon
          name="bug"
          :size="28"
          :stroke-width="1"
          class="text-muted-foreground mb-3"
        />
        <p class="text-sm font-medium text-foreground">
          No issues match
        </p>
        <p class="text-xs text-muted-foreground mt-1">
          Try adjusting your filters.
        </p>
      </div>

      <!-- Table -->
      <table v-else class="w-full text-sm">
        <tbody class="divide-y divide-border">
          <tr
            v-for="issue in filtered"
            :key="issue.id"
            @click="$router.push(`/issue/${issue.id}`)"
            class="group flex items-center gap-3 px-5 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
          >
            <!-- Mode icon -->
            <td class="flex-shrink-0 w-5 flex items-center justify-center">
              <ModeIcon :mode="issue.mode" />
            </td>

            <!-- Title + meta -->
            <td class="flex-1 min-w-0">
              <p
                class="text-sm text-foreground truncate transition-colors"
              >
                {{ issue.title }}
              </p>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="font-mono text-2xs text-muted-foreground">{{
                  issue.id
                }}</span>
                <span
                  v-if="issue.pageUrl"
                  class="text-2xs text-muted-foreground truncate max-w-[220px]"
                  >{{ hostOf(issue.pageUrl) }}</span
                >
                <span
                  v-if="issue.environment"
                  class="text-2xs text-muted-foreground"
                  >{{ issue.environment }}</span
                >
              </div>
            </td>

            <!-- Labels -->
            <td class="hidden xl:flex items-center gap-1 flex-shrink-0">
              <span
                v-for="label in issue.labels.slice(0, 3)"
                :key="label"
                class="chip bg-muted text-secondary-foreground"
                >{{ label }}</span
              >
            </td>

            <!-- External links -->
            <td class="hidden lg:flex items-center gap-1 flex-shrink-0">
              <span
                v-for="link in issue.externalLinks"
                :key="link.externalId"
                class="font-mono text-2xs text-secondary-foreground bg-muted px-1.5 py-0.5 rounded"
                >{{
                  link.provider === "linear"
                    ? "LIN"
                    : link.provider === "github"
                    ? "GH"
                    : link.provider.toUpperCase()
                }}-{{ link.externalId }}</span
              >
            </td>

            <!-- Severity -->
            <td class="flex-shrink-0 w-20 flex justify-end">
              <SeverityChip :severity="issue.severity" />
            </td>

            <!-- Status -->
            <td class="flex-shrink-0 w-28 flex justify-end">
              <StatusChip :status="issue.status" />
            </td>

            <!-- Age -->
            <td class="flex-shrink-0 w-16 text-right">
              <span class="text-xs text-muted-foreground">{{
                timeAgo(issue.createdAt)
              }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import Icon from "@/components/base/Icon.vue";
import { Button, Input } from "@deveprobe/ui";
import type { IssueStatus, Severity, IssueMode } from "@deveprobe/shared";
import SeverityChip from "@/components/SeverityChip.vue";
import StatusChip from "@/components/StatusChip.vue";
import ModeIcon from "@/components/ModeIcon.vue";
import { MOCK_ISSUES } from "@/lib/mock.js";
import { timeAgo } from "@/lib/format.js";

const issues = MOCK_ISSUES;

const q = ref("");
const statusFilter = ref<IssueStatus | "">("");
const severityFilter = ref<Severity | "">("");
const modeFilter = ref<IssueMode | "">("");

const statusOptions: { value: IssueStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "triaged", label: "Triaged" },
  { value: "awaiting_verification", label: "Awaiting QA" },
  { value: "resolved", label: "Resolved" },
];

function toggleStatus(val: IssueStatus | "") {
  statusFilter.value = statusFilter.value === val ? "" : val;
}

const hasFilters = computed(
  () =>
    q.value !== "" ||
    statusFilter.value !== "" ||
    severityFilter.value !== "" ||
    modeFilter.value !== ""
);

function clearFilters() {
  q.value = "";
  statusFilter.value = "";
  severityFilter.value = "";
  modeFilter.value = "";
}

const filtered = computed(() => {
  return issues.filter((i) => {
    if (statusFilter.value && i.status !== statusFilter.value) return false;
    if (severityFilter.value && i.severity !== severityFilter.value)
      return false;
    if (modeFilter.value && i.mode !== modeFilter.value) return false;
    if (q.value) {
      const needle = q.value.toLowerCase();
      return (
        i.title.toLowerCase().includes(needle) ||
        i.id.toLowerCase().includes(needle) ||
        i.summary?.toLowerCase().includes(needle) ||
        i.pageUrl?.toLowerCase().includes(needle) ||
        i.labels.some((l) => l.toLowerCase().includes(needle))
      );
    }
    return true;
  });
});

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
</script>
