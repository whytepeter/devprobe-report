<!--
  ScreenshotView
  ──────────────
  Hero area for `mode === 'screenshot'` issues.

  Picks the captured PNG (or thumbnail) attachment and renders it inside a
  soft window-frame so it reads as "a snapshot of a page" rather than just an
  inline image. If no image attachment exists, falls back to a skeleton — the
  rest of the issue (title, description, comments) is still usable.

  Responsibilities (kept narrow):
    • Locate the hero attachment by type.
    • Wrap it in the window chrome.
  Anything cross-mode (URL line, title, metadata, activity) lives in the
  IssuePage shell. DO NOT duplicate it here.
-->
<template>
  <figure class="overflow-hidden rounded-2xl border border-border bg-muted/30">
    <!-- Window chrome: subtle traffic-light strip so the image reads as a captured browser frame. -->
    <div class="flex h-7 items-center gap-1.5 border-b border-border/60 bg-muted/40 px-3">
      <span class="h-2 w-2 rounded-full bg-foreground/15" />
      <span class="h-2 w-2 rounded-full bg-foreground/15" />
      <span class="h-2 w-2 rounded-full bg-foreground/15" />
    </div>

    <div class="relative">
      <IssueMediaImage
        v-if="heroImageId"
        :attachment-id="heroImageId"
        :alt="issue.title"
        class="block w-full"
      />
      <div v-else class="aspect-[16/9] bg-muted/40 flex items-center justify-center text-xs text-muted-foreground">
        Screenshot unavailable
      </div>
    </div>
  </figure>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Issue, Attachment } from "@deveprobe/shared";
import IssueMediaImage from "@/features/issues/components/IssueMediaImage.vue";

const props = defineProps<{
  issue:       Issue;
  attachments: Attachment[];
}>();

// Prefer 'screenshot' over 'thumbnail' (full-res over placeholder).
const heroImageId = computed<string | null>(() => {
  const screenshot = props.attachments.find((a) => a.type === "screenshot");
  if (screenshot) return screenshot.id;
  const thumbnail  = props.attachments.find((a) => a.type === "thumbnail");
  return thumbnail?.id ?? null;
});
</script>
