<!--
  ActionsTab
  ──────────
  Stream of user_action + navigation events with text filter + sort order.
-->
<template>
  <div class="flex h-full flex-col">
    <!-- Filter strip -->
    <div class="flex items-center gap-2 px-4 py-3 border-b border-border">
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
          placeholder="Filter actions"
          class="w-full rounded-md border border-border bg-background pl-7 pr-2 h-8 text-[13px] placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div class="relative">
        <select
          v-model="filter.sort.value"
          class="appearance-none rounded-md border border-border bg-background pl-2.5 pr-7 h-8 text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="latest">Latest first</option>
          <option value="earliest">Earliest first</option>
        </select>
        <Icon
          name="chevron-down"
          :size="12"
          :stroke-width="2"
          class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
      </div>
    </div>

    <!-- Rows -->
    <div class="flex-1 overflow-y-auto">
      <p
        v-if="filter.filtered.value.length === 0"
        class="px-4 py-6 text-center text-xs text-muted-foreground"
      >
        No user actions captured.
      </p>
      <ul v-else class="divide-y divide-border/40">
        <li v-for="event in filter.filtered.value" :key="event.id">
          <ActionRow :event="event" @seek="emit('seek', $event)" />
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toRef } from "vue";
import { Icon } from "@deveprobe/ui";
import ActionRow from "./ActionRow.vue";
import { useActionsFilter } from "./useActionsFilter.js";
import type { TimelineEvent } from "@deveprobe/shared";

const props = defineProps<{ events: TimelineEvent[] }>();
const emit = defineEmits<{ seek: [ms: number] }>();

const filter = useActionsFilter(toRef(() => props.events));
</script>
