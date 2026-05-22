<!--
  InfoTab
  ───────
  Session metadata summary. Two regions:
    1. URL row + Custom logs (add-logs CTA reserved for future feature)
    2. Environment facts pulled from issue.browserMeta — timestamp, location,
       OS, browser, viewport, network, locale.

  Tolerant of missing fields — every row falls back to "—" so an incomplete
  capture still renders cleanly. The shape of browserMeta is intentionally
  loose: the extension fills what it can, server doesn't enforce keys.
-->
<template>
  <div class="space-y-5 p-4">
    <!-- URL + Custom logs card -->
    <section class="rounded-xl border border-border divide-y divide-border bg-card/40">
      <InfoRow label="URL">
        <a
          v-if="meta.pageUrl"
          :href="meta.pageUrl"
          target="_blank"
          rel="noopener"
          class="truncate text-primary hover:underline"
        >{{ meta.pageUrl }}</a>
        <span v-else class="text-muted-foreground">—</span>
      </InfoRow>
      <InfoRow label="Custom logs">
        <button
          type="button"
          class="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Icon name="plus" :size="12" :stroke-width="2" />
          Add logs
        </button>
      </InfoRow>
    </section>

    <!-- Environment facts -->
    <section class="space-y-0 px-2">
      <InfoRow label="Timestamp" :value="timestamp" />
      <InfoRow label="Location"  :value="meta.location ?? null" />
      <InfoRow label="OS">
        <template v-if="meta.os">
          <span class="flex flex-wrap items-center gap-1.5">
            <span class="inline-block h-3 w-3 rounded-[3px] bg-foreground/15" aria-hidden="true" />
            {{ meta.os }}
            <span v-if="meta.osVersion" class="text-muted-foreground">{{ meta.osVersion }}</span>
          </span>
        </template>
      </InfoRow>
      <InfoRow label="Browser">
        <template v-if="meta.browser">
          <span class="flex flex-wrap items-center gap-1.5">
            <span class="inline-block h-3 w-3 rounded-full bg-foreground/15" aria-hidden="true" />
            {{ meta.browser }}
            <span v-if="meta.browserVersion" class="text-muted-foreground">{{ meta.browserVersion }}</span>
          </span>
        </template>
      </InfoRow>
      <InfoRow label="Window size" :value="windowSize" />
      <InfoRow label="Viewport">
        <template v-if="viewport">
          <span>{{ viewport }} <span v-if="meta.devicePixelRatio" class="text-muted-foreground">· DPR {{ meta.devicePixelRatio }}</span></span>
        </template>
      </InfoRow>
      <InfoRow label="Network"    :value="meta.network ?? null" />
      <InfoRow label="Locale"     :value="meta.locale ?? null" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Icon } from "@deveprobe/ui";
import InfoRow from "./InfoRow.vue";
import type { Issue } from "@deveprobe/shared";

const props = defineProps<{ issue: Issue }>();

// browserMeta is jsonb — defensive read so a missing/partial payload doesn't
// blow up the panel.
type BrowserMeta = {
  pageUrl?:          string;
  location?:         string;
  os?:               string;
  osVersion?:        string;
  browser?:          string;
  browserVersion?:   string;
  windowWidth?:      number;
  windowHeight?:     number;
  viewportWidth?:    number;
  viewportHeight?:   number;
  devicePixelRatio?: number;
  network?:          string;
  locale?:           string;
};

const meta = computed<BrowserMeta>(() => (props.issue.browserMeta as BrowserMeta) ?? {});

const timestamp = computed(() => {
  const d = new Date(props.issue.createdAt);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    day:   "numeric",
    month: "long",
    year:  "numeric",
    hour:  "2-digit",
    minute:"2-digit",
  });
});

const windowSize = computed(() =>
  meta.value.windowWidth && meta.value.windowHeight
    ? `${meta.value.windowWidth} × ${meta.value.windowHeight}`
    : null,
);

const viewport = computed(() =>
  meta.value.viewportWidth && meta.value.viewportHeight
    ? `${meta.value.viewportWidth} × ${meta.value.viewportHeight}`
    : null,
);
</script>
