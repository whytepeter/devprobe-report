<!--
  PinView
  ───────
  Hero area for `mode === 'live_annotation'` issues.

  Pins are tied to a specific point on a page rather than a captured image,
  so the "hero" is a callout banner — "PINNED ON <page>" + the comment the
  reporter wrote. Lets the viewer see the context (which page, what was
  flagged) without scrolling further.

  If a pin screenshot attachment exists (some clients capture one on pin
  drop), it's shown below the banner via IssueMediaImage. Otherwise just the
  banner.

  Responsibilities (kept narrow):
    • Render the pinned-on callout.
    • Optionally render the pin screenshot (when captured).
  Page URL, title, description, metadata, activity → IssuePage shell.
-->
<template>
  <div class="space-y-4">
    <!-- Callout banner -->
    <aside
      class="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-50/70 px-5 py-4 dark:bg-amber-500/10"
    >
      <span class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-300">
        <Icon name="map-pin" :size="14" :stroke-width="2" />
      </span>

      <div class="min-w-0 space-y-1">
        <p class="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-700 dark:text-amber-300">
          <Icon name="map-pin" :size="10" :stroke-width="2" />
          Pinned on
          <span class="font-mono normal-case tracking-normal text-foreground/80">{{ displayUrl }}</span>
        </p>
        <p
          v-if="comment"
          class="text-sm leading-relaxed text-foreground/85 whitespace-pre-wrap"
        >
          {{ comment }}
        </p>
      </div>
    </aside>

    <!-- Optional pin screenshot (if the client captured one when the pin was dropped) -->
    <figure
      v-if="heroImageId"
      class="overflow-hidden rounded-2xl border border-border bg-muted/30"
    >
      <IssueMediaImage
        :attachment-id="heroImageId"
        :alt="issue.title"
        class="block w-full"
      />
    </figure>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Icon } from "@deveprobe/ui";
import IssueMediaImage from "@/features/issues/components/IssueMediaImage.vue";
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

// Pin comment lives on issue.summary today (reporter's note). When the Pin
// model gains a dedicated `comment` field we can swap to it without touching
// the shell.
const comment = computed(() => props.issue.summary ?? "");

const heroImageId = computed<string | null>(() => {
  const screenshot = props.attachments.find((a) => a.type === "screenshot");
  if (screenshot) return screenshot.id;
  const thumbnail  = props.attachments.find((a) => a.type === "thumbnail");
  return thumbnail?.id ?? null;
});
</script>
