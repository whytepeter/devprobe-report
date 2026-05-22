<!--
  NetworkResourceFilters
  ──────────────────────
  Resource-type pill row above the network table. Single-selection — clicking
  the active pill resets to "All".
-->
<template>
  <div class="flex flex-wrap gap-1.5 px-4 pb-3">
    <button
      v-for="opt in OPTIONS"
      :key="opt.value"
      type="button"
      :aria-pressed="value === opt.value"
      :class="[
        'inline-flex items-center rounded-full px-2.5 h-7 text-[12px] transition-colors',
        value === opt.value
          ? 'bg-foreground text-background'
          : 'bg-muted text-foreground/80 hover:bg-muted/70',
      ]"
      @click="emit('update:value', value === opt.value ? 'all' : opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import type { NetworkResource } from "./useNetworkFilter.js";

defineProps<{ value: NetworkResource }>();
const emit = defineEmits<{ "update:value": [value: NetworkResource] }>();

const OPTIONS: { value: NetworkResource; label: string }[] = [
  { value: "all",       label: "All" },
  { value: "fetch-xhr", label: "Fetch/XHR" },
  { value: "xhr",       label: "Xhr" },
  { value: "ws",        label: "WS" },
  { value: "script",    label: "Script" },
  { value: "css",       label: "Css" },
  { value: "image",     label: "Image" },
  { value: "doc",       label: "Doc" },
  { value: "svg",       label: "Svg" },
  { value: "woff2",     label: "Woff2" },
];
</script>
