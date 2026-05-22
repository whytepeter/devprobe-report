<!--
  NetworkRow
  ──────────
  Single row in the Network table. Columns: # / Name / Method / Status /
  Domain / Type. Errors (status 0 or ≥400) get a red wash.

  Defensive about `data` shape — page-probe's payload is loose and some
  pages may capture fewer fields.
-->
<template>
  <button
    type="button"
    :class="[
      'grid w-full grid-cols-[28px_1fr_56px_56px_1.2fr_64px] items-center gap-3 px-3 py-1.5 text-left text-[12px] transition-colors',
      isError
        ? 'bg-rose-50/60 hover:bg-rose-100/70 text-rose-700 dark:bg-rose-500/10 dark:hover:bg-rose-500/15 dark:text-rose-300'
        : 'hover:bg-muted/60 text-foreground/90',
    ]"
    @click="$emit('seek', event.timestampMs)"
  >
    <span class="text-muted-foreground tabular-nums text-[11px]">{{ index }}</span>
    <span class="flex items-center gap-1.5 min-w-0">
      <span :class="['inline-block h-3 w-3 shrink-0 rounded-[3px]', typeSwatch]" aria-hidden="true" />
      <span class="truncate font-mono">{{ shortName }}</span>
    </span>
    <span class="font-mono">{{ method }}</span>
    <span class="font-mono">{{ status }}</span>
    <span class="truncate font-mono text-muted-foreground">{{ domain }}</span>
    <span class="text-muted-foreground">{{ resourceLabel }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { TimelineEvent } from "@deveprobe/shared";
import type { NetworkResource } from "./useNetworkFilter.js";

const props = defineProps<{
  event:        TimelineEvent;
  index:        number;
  resource:     NetworkResource;
}>();

defineEmits<{ seek: [ms: number] }>();

interface NetworkData {
  method?: string;
  status?: number | string;
  url?:    string;
}

const data = computed<NetworkData>(() => (props.event.data as NetworkData) ?? {});

const method = computed(() => (data.value.method ?? "GET").toUpperCase());
const rawStatus = computed(() => data.value.status ?? "—");
const status = computed(() => {
  const v = rawStatus.value;
  if (typeof v === "number" && v === 0) return "ABORT";
  return String(v);
});

const isError = computed(() => {
  const s = data.value.status;
  if (typeof s !== "number") return false;
  return s === 0 || s >= 400;
});

const parsed = computed(() => {
  try { return data.value.url ? new URL(data.value.url) : null; }
  catch { return null; }
});
const shortName = computed(() => {
  const u = parsed.value;
  if (!u) return data.value.url ?? "—";
  const segs = u.pathname.split("/").filter(Boolean);
  return segs[segs.length - 1] ?? u.pathname ?? "/";
});
const domain = computed(() => parsed.value?.host ?? "—");

const resourceLabel = computed(() => {
  switch (props.resource) {
    case "fetch-xhr": return "fetch";
    case "xhr":       return "xhr";
    case "ws":        return "ws";
    case "script":    return "script";
    case "css":       return "css";
    case "image":     return "image";
    case "doc":       return "doc";
    case "svg":       return "svg";
    case "woff2":     return "font";
    default:          return "—";
  }
});

const typeSwatch = computed(() => {
  switch (props.resource) {
    case "image":     return "bg-emerald-400";
    case "script":    return "bg-amber-300";
    case "css":       return "bg-sky-400";
    case "doc":       return "bg-violet-400";
    case "fetch-xhr":
    case "xhr":       return "bg-orange-400";
    case "ws":        return "bg-pink-400";
    case "svg":       return "bg-teal-400";
    case "woff2":     return "bg-violet-300";
    default:          return "bg-muted-foreground/30";
  }
});
</script>
