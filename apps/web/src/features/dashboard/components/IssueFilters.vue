<!--
  IssueFilters
  ────────────
  Top filter bar for the Issues page. Mirrors the mockup: pill dropdowns for
  Type / Severity / Status / Created by / Last 30 days on the left, Sort on
  the right. Backed by the shadcn Select component.
-->
<template>
  <div class="px-6 py-3 flex flex-wrap items-center gap-2 border-b border-border bg-background">
    <!-- Type -->
    <Select v-model="filters.mode">
      <SelectTrigger class="h-8 w-auto min-w-[120px] gap-1.5 text-xs">
        <Icon name="filter" :size="12" :stroke-width="1.75" class="text-muted-foreground" />
        <SelectValue placeholder="Type" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All types</SelectItem>
        <SelectItem value="screenshot">Screenshot</SelectItem>
        <SelectItem value="screen_recording">Recording</SelectItem>
        <SelectItem value="live_annotation">Pin</SelectItem>
      </SelectContent>
    </Select>

    <!-- Severity -->
    <Select v-model="filters.severity">
      <SelectTrigger class="h-8 w-auto min-w-[120px] text-xs">
        <SelectValue placeholder="Severity" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All severities</SelectItem>
        <SelectItem value="critical">Critical</SelectItem>
        <SelectItem value="high">High</SelectItem>
        <SelectItem value="medium">Medium</SelectItem>
        <SelectItem value="low">Low</SelectItem>
      </SelectContent>
    </Select>

    <!-- Status -->
    <Select v-model="filters.status">
      <SelectTrigger class="h-8 w-auto min-w-[120px] text-xs">
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All statuses</SelectItem>
        <SelectItem value="open">Open</SelectItem>
        <SelectItem value="triaged">Triaged</SelectItem>
        <SelectItem value="in_progress">In progress</SelectItem>
        <SelectItem value="awaiting_verification">Awaiting QA</SelectItem>
        <SelectItem value="resolved">Resolved</SelectItem>
      </SelectContent>
    </Select>

    <!-- Search -->
    <div class="relative ml-1">
      <Icon
        name="search"
        :size="12"
        class="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
        :stroke-width="2"
      />
      <Input
        v-model="filters.q"
        class="pl-7 h-8 text-xs w-52 bg-card"
        placeholder="Search issues…"
      />
    </div>

    <button
      v-if="hasFilters"
      type="button"
      class="ml-1 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
      @click="$emit('clear')"
    >
      <Icon name="x" :size="12" :stroke-width="2" />
      Clear
    </button>

    <!-- Sort -->
    <Select v-model="sort" class="ml-auto">
      <SelectTrigger class="h-8 w-auto min-w-[140px] text-xs ml-auto">
        <SelectValue placeholder="Sort" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="recent">Sort: Recent</SelectItem>
        <SelectItem value="severity">Sort: Severity</SelectItem>
      </SelectContent>
    </Select>
  </div>
</template>

<script setup lang="ts">
import {
  Icon,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@deveprobe/ui";
import type { IssueFilters as Filters } from "@/features/dashboard/composables/useIssues.js";

defineProps<{
  filters: Filters;
  hasFilters: boolean;
}>();

defineEmits<{ clear: [] }>();

const sort = defineModel<string>("sort", { default: "recent" });
</script>
