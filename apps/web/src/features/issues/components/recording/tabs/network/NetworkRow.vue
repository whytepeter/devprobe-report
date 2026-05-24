<!--
  NetworkRow
  ──────────
  Single row in the Network table. Columns: # / Name (swatch + method + file)
  / Status / Time (duration) / Size / Type / expand-chevron. Errors (status 0
  or ≥400) get a red wash.

  Interaction:
    • Click the row    → seek the player to when the request fired.
    • Click the chevron → expand the NetworkDetail drawer (metadata + GraphQL
      errors + a seek button). Drawer toggle stops propagation so it doesn't
      also seek.

  Defensive about `data` shape — page-probe's payload is loose and older
  recordings may carry fewer fields.
-->
<template>
  <div :class="isError ? 'bg-rose-50/40 dark:bg-rose-500/[0.07]' : ''">
    <div
      role="button"
      tabindex="0"
      :class="[
        'grid w-full grid-cols-[22px_1fr_44px_52px_54px_46px_20px] items-center gap-2 px-3 py-1.5 text-left text-[12px] cursor-pointer transition-colors',
        isError
          ? 'text-rose-700 hover:bg-rose-100/50 dark:text-rose-300 dark:hover:bg-rose-500/10'
          : 'hover:bg-muted/60 text-foreground/90',
      ]"
      @click="$emit('seek', seekMs)"
      @keydown.enter="$emit('seek', seekMs)"
    >
      <span class="text-muted-foreground tabular-nums text-[11px]">{{ index }}</span>

      <span class="flex items-center gap-1.5 min-w-0">
        <span :class="['inline-block h-3 w-3 shrink-0 rounded-[3px]', typeSwatch]" aria-hidden="true" />
        <span class="shrink-0 font-mono text-[10px] text-muted-foreground">{{ method }}</span>
        <span class="truncate font-mono">{{ shortName }}</span>
      </span>

      <span class="font-mono" :class="isError ? 'font-semibold' : ''">{{ status }}</span>
      <span class="font-mono text-muted-foreground tabular-nums">{{ durationLabel }}</span>
      <span class="font-mono text-muted-foreground tabular-nums">{{ sizeLabel }}</span>
      <span class="truncate text-muted-foreground">{{ resourceLabel }}</span>

      <button
        type="button"
        class="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        :aria-label="expanded ? 'Collapse detail' : 'Expand detail'"
        @click.stop="expanded = !expanded"
      >
        <Icon :name="expanded ? 'chevron-down' : 'chevron-right'" :size="13" :stroke-width="2" />
      </button>
    </div>

    <NetworkDetail
      v-if="expanded"
      :event="event"
      :resource-label="resourceLabel"
      @seek="$emit('seek', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { Icon } from "@deveprobe/ui";
import type { TimelineEvent } from "@deveprobe/shared";
import type { NetworkResource } from "./useNetworkFilter.js";
import NetworkDetail from "./NetworkDetail.vue";
import { formatBytes, formatDuration } from "./format.js";

const props = defineProps<{
  event:    TimelineEvent;
  index:    number;
  resource: NetworkResource;
}>();

defineEmits<{ seek: [ms: number] }>();

const expanded = ref(false);

interface NetworkData {
  method?:     string;
  status?:     number | string;
  url?:        string;
  durationMs?: number;
  sizeBytes?:  number;
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

const durationLabel = computed(() => formatDuration(data.value.durationMs));
const sizeLabel     = computed(() => formatBytes(data.value.sizeBytes));

// Seek to when the request fired (span start) — falls back to the row time.
const seekMs = computed(() => props.event.startTimestampMs ?? props.event.timestampMs);

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
