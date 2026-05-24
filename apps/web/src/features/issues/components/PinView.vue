<!--
  PinView
  ───────
  Hero area for `mode === 'live_annotation'` issues — the GROUPED model: one
  issue holds many pins.

  Layout:
    1. Cover screenshot (captured from the first pin) — gives the issue a
       visual on the card + at the top of the detail page.
    2. "Pinned on <page>" banner.
    3. The pin list (IssuePinList) — each pin's comment, links, status.

  Page URL line, title, description, metadata, activity → IssuePage shell.
-->
<template>
  <div class="space-y-4">
    <!-- Cover screenshot (first-pin capture) -->
    <figure
      v-if="coverImageId"
      class="overflow-hidden rounded-2xl border border-border bg-muted/30"
    >
      <IssueMediaImage
        :attachment-id="coverImageId"
        :alt="issue.title"
        class="block w-full"
      />
    </figure>

    <!-- Pinned-on banner -->
    <aside
      class="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-50/70 px-5 py-3 dark:bg-amber-500/10"
    >
      <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-300">
        <Icon name="map-pin" :size="14" :stroke-width="2" />
      </span>
      <p class="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-700 dark:text-amber-300">
        Pinned on
        <span class="font-mono normal-case tracking-normal text-foreground/80">{{ displayUrl }}</span>
      </p>
    </aside>

    <!-- Pins -->
    <IssuePinList :pins="pins" :loading="loading" />
  </div>
</template>

<script setup lang="ts">
import { computed, toRef } from "vue";
import { Icon } from "@deveprobe/ui";
import IssueMediaImage from "@/features/issues/components/IssueMediaImage.vue";
import IssuePinList from "@/features/issues/components/IssuePinList.vue";
import { useIssuePins } from "@/features/issues/composables/useIssuePins.js";
import type { Issue, Attachment } from "@deveprobe/shared";

const props = defineProps<{
  issue:       Issue;
  attachments: Attachment[];
}>();

const displayUrl = computed(() => {
  if (!props.issue.pageUrl) return "the page";
  try {
    const u = new URL(props.issue.pageUrl);
    return u.host + (u.pathname === "/" ? "" : u.pathname);
  } catch {
    return props.issue.pageUrl;
  }
});

// Cover = the first-pin screenshot uploaded on submit (type screenshot/thumbnail).
const coverImageId = computed<string | null>(() => {
  const screenshot = props.attachments.find((a) => a.type === "screenshot");
  if (screenshot) return screenshot.id;
  const thumbnail = props.attachments.find((a) => a.type === "thumbnail");
  return thumbnail?.id ?? null;
});

// Grouped pins for this issue.
const { pins, loading } = useIssuePins(toRef(() => props.issue.id));
</script>
