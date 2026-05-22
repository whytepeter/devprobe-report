<!--
  ConsoleTab
  ──────────
  Composes ConsoleFilters + a scrollable list of ConsoleRows.

  Filter state is owned here (via useConsoleFilter); rows emit `seek` which
  bubbles up to the parent so the video player can scrub.

  The tab intentionally shows MORE than just console.* — error, network, and
  user_action rows appear too — but the level + quick filters let the user
  narrow it down. This matches the "everything that happened on this page"
  reading.
-->
<template>
  <div class="flex h-full flex-col">
    <ConsoleFilters
      :query="filter.query.value"
      :level="filter.level.value"
      :quick="filter.quick.value"
      @update:query="filter.query.value = $event"
      @update:level="filter.level.value = $event"
      @toggle-quick="filter.setQuick($event)"
    />

    <div class="flex-1 overflow-y-auto">
      <p
        v-if="filter.filtered.value.length === 0"
        class="px-4 py-6 text-center text-xs text-muted-foreground"
      >
        No console events match the current filters.
      </p>
      <ul v-else class="divide-y divide-border/40">
        <li v-for="event in filter.filtered.value" :key="event.id">
          <ConsoleRow :event="event" @seek="emit('seek', $event)" />
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toRef } from "vue";
import ConsoleFilters from "./ConsoleFilters.vue";
import ConsoleRow from "./ConsoleRow.vue";
import { useConsoleFilter } from "./useConsoleFilter.js";
import type { TimelineEvent } from "@deveprobe/shared";

const props = defineProps<{ events: TimelineEvent[] }>();

const emit = defineEmits<{ seek: [ms: number] }>();

const filter = useConsoleFilter(toRef(() => props.events));
</script>
