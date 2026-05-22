<!--
  ConsoleFilters
  ──────────────
  Filter strip above the console rows.

  Row 1: free-text search input + "All levels" select.
  Row 2: three quick-filter pills (Page navigations / Network errors / User activity).
         Each pill is a toggle; clicking the active one clears it.

  All state is owned by the parent (ConsoleTab) via v-model bindings — this
  component is dumb on purpose.
-->
<template>
  <div class="space-y-2.5 px-4 py-3 border-b border-border">
    <!-- Search + level -->
    <div class="flex items-center gap-2">
      <div class="relative flex-1">
        <Icon
          name="search"
          :size="13"
          :stroke-width="1.75"
          class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          :value="query"
          type="text"
          placeholder="Filter"
          class="w-full rounded-md border border-border bg-background pl-7 pr-2 h-8 text-[13px] placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
          @input="emit('update:query', ($event.target as HTMLInputElement).value)"
        />
      </div>

      <div class="relative">
        <select
          :value="level"
          class="appearance-none rounded-md border border-border bg-background pl-2.5 pr-7 h-8 text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
          @change="emit('update:level', ($event.target as HTMLSelectElement).value as ConsoleLevelFilter)"
        >
          <option value="all">All levels</option>
          <option value="log">Log</option>
          <option value="info">Info</option>
          <option value="warn">Warn</option>
          <option value="error">Error</option>
          <option value="debug">Debug</option>
        </select>
        <Icon
          name="chevron-down"
          :size="12"
          :stroke-width="2"
          class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
      </div>
    </div>

    <!-- Quick filters -->
    <div class="flex flex-wrap gap-1.5">
      <FilterPill :active="quick === 'navigations'"     icon-color="bg-violet-500" @click="emit('toggle-quick', 'navigations')">
        Page navigations
      </FilterPill>
      <FilterPill :active="quick === 'network-errors'"  icon="globe"  @click="emit('toggle-quick', 'network-errors')">
        Network errors
      </FilterPill>
      <FilterPill :active="quick === 'user-activity'"   icon="arrow-right" @click="emit('toggle-quick', 'user-activity')">
        User activity
      </FilterPill>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from "@deveprobe/ui";
import FilterPill from "./FilterPill.vue";
import type { ConsoleLevelFilter, QuickFilter } from "./useConsoleFilter.js";

defineProps<{
  query: string;
  level: ConsoleLevelFilter;
  quick: QuickFilter;
}>();

const emit = defineEmits<{
  "update:query":  [value: string];
  "update:level":  [value: ConsoleLevelFilter];
  "toggle-quick":  [value: NonNullable<QuickFilter>];
}>();
</script>
