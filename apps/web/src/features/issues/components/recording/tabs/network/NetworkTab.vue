<!--
  NetworkTab
  ──────────
  Filter strip (text + Errors only) → resource-type pills → table with
  column header → scrollable rows.

  Filter state owned via useNetworkFilter so the tab body stays declarative.
-->
<template>
  <div class="flex h-full flex-col">
    <!-- Filter strip -->
    <div class="flex items-center gap-3 px-4 py-3 border-b border-border">
      <div class="relative flex-1">
        <Icon
          name="search"
          :size="13"
          :stroke-width="1.75"
          class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          v-model="filter.query.value"
          type="text"
          placeholder="Filter"
          class="w-full rounded-md border border-border bg-background pl-7 pr-2 h-8 text-[13px] placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <label class="inline-flex shrink-0 items-center gap-1.5 text-[12px] text-foreground/85">
        <input
          v-model="filter.errorsOnly.value"
          type="checkbox"
          class="h-3.5 w-3.5 rounded border-border accent-foreground"
        />
        Errors only
      </label>
    </div>

    <!-- Resource pills -->
    <NetworkResourceFilters
      :value="filter.resource.value"
      class="pt-3"
      @update:value="filter.resource.value = $event"
    />

    <!-- Column header -->
    <div class="grid grid-cols-[22px_1fr_44px_52px_54px_46px_20px] items-center gap-2 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-y border-border bg-muted/30">
      <span></span>
      <span>Name</span>
      <span>Status</span>
      <span>Time</span>
      <span>Size</span>
      <span>Type</span>
      <span></span>
    </div>

    <!-- Rows -->
    <div class="flex-1 overflow-y-auto">
      <p
        v-if="filter.filtered.value.length === 0"
        class="px-4 py-6 text-center text-xs text-muted-foreground"
      >
        No network events match the current filters.
      </p>
      <ul v-else class="divide-y divide-border/40">
        <li
          v-for="(event, i) in filter.filtered.value"
          :key="event.id"
        >
          <NetworkRow
            :event="event"
            :index="i + 1"
            :resource="filter.classifyResource(event)"
            @seek="emit('seek', $event)"
          />
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toRef } from "vue";
import { Icon } from "@deveprobe/ui";
import NetworkResourceFilters from "./NetworkResourceFilters.vue";
import NetworkRow from "./NetworkRow.vue";
import { useNetworkFilter } from "./useNetworkFilter.js";
import type { TimelineEvent } from "@deveprobe/shared";

const props = defineProps<{ events: TimelineEvent[] }>();
const emit = defineEmits<{ seek: [ms: number] }>();

const filter = useNetworkFilter(toRef(() => props.events));
</script>
