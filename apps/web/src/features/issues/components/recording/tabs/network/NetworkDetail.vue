<!--
  NetworkDetail
  ─────────────
  Expanded detail drawer for a network row (spec §193 "Detail drawer for
  request and response"). Shows the full redacted request line plus the
  metadata captured by the page probe — method, status, duration, size,
  content-type, resource type, and any GraphQL errors — and a button to seek
  the player to the moment the request fired.

  Bodies/headers are intentionally NOT captured (privacy, per the recording
  spec) so this drawer surfaces metadata only.
-->
<template>
  <div class="border-t border-border/60 bg-muted/30 px-3 py-2.5 text-[12px]">
    <!-- Full URL -->
    <div class="mb-2 break-all font-mono text-[11px] text-foreground/80">
      {{ url }}
    </div>

    <!-- Metadata grid -->
    <dl class="grid grid-cols-2 gap-x-4 gap-y-1.5">
      <div v-for="row in rows" :key="row.label" class="flex items-baseline justify-between gap-2">
        <dt class="text-muted-foreground">{{ row.label }}</dt>
        <dd class="font-mono text-right" :class="row.cls ?? 'text-foreground/85'">{{ row.value }}</dd>
      </div>
    </dl>

    <!-- GraphQL errors -->
    <div v-if="graphqlErrors.length" class="mt-2.5 space-y-1">
      <p class="text-[10px] font-semibold uppercase tracking-wider text-rose-500">GraphQL errors</p>
      <ul class="space-y-0.5">
        <li
          v-for="(err, i) in graphqlErrors"
          :key="i"
          class="rounded bg-rose-500/10 px-2 py-1 font-mono text-[11px] text-rose-600 dark:text-rose-300"
        >
          {{ err }}
        </li>
      </ul>
    </div>

    <!-- Seek -->
    <button
      type="button"
      class="mt-2.5 inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-foreground/80 hover:bg-muted transition-colors"
      @click="$emit('seek', seekMs)"
    >
      <Icon name="play" :size="11" :stroke-width="2" />
      Seek to {{ clock }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Icon } from "@deveprobe/ui";
import type { TimelineEvent } from "@deveprobe/shared";
import { formatBytes, formatDuration, formatClock } from "./format.js";

const props = defineProps<{
  event:         TimelineEvent;
  resourceLabel: string;
}>();

defineEmits<{ seek: [ms: number] }>();

interface NetworkData {
  url?:          string;
  method?:       string;
  status?:       number | string;
  durationMs?:   number;
  sizeBytes?:    number;
  contentType?:  string;
  graphqlErrors?: string[];
}

const data = computed<NetworkData>(() => (props.event.data as NetworkData) ?? {});

const url = computed(() => data.value.url ?? "—");
const seekMs = computed(() => props.event.startTimestampMs ?? props.event.timestampMs);
const clock  = computed(() => formatClock(seekMs.value));
const graphqlErrors = computed(() => data.value.graphqlErrors ?? []);

const rows = computed(() => {
  const d = data.value;
  const status = d.status ?? "—";
  const isError = typeof status === "number" && (status === 0 || status >= 400);
  return [
    { label: "Method",   value: String(d.method ?? "GET").toUpperCase() },
    { label: "Status",   value: status === 0 ? "ABORTED" : String(status), cls: isError ? "text-rose-600 dark:text-rose-400" : undefined },
    { label: "Duration", value: formatDuration(d.durationMs) },
    { label: "Size",     value: formatBytes(d.sizeBytes) },
    { label: "Type",     value: props.resourceLabel },
    { label: "Content",  value: d.contentType ? d.contentType.split(";")[0]! : "—" },
  ];
});
</script>
