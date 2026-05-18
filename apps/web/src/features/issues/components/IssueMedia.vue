<!--
  IssueMedia
  ──────────
  Hero card showing the issue's primary capture.
  Picks the right media type and delegates rendering:
  - video → IssueMediaVideo
  - screenshot/thumbnail → IssueMediaImage
  - nothing → placeholder skeleton
-->
<template>
  <figure class="rounded-2xl border border-border bg-card overflow-hidden">
    <IssueMediaVideo
      v-if="heroVideoId"
      :attachment-id="heroVideoId"
    >
      <template #overlay>
        <div class="absolute top-3 left-3 z-10"><TypeChip :mode="issue.mode" /></div>
      </template>
    </IssueMediaVideo>

    <IssueMediaImage
      v-else-if="heroImageId"
      :attachment-id="heroImageId"
      :alt="issue.title"
    >
      <template #overlay>
        <div class="absolute top-3 left-3"><TypeChip :mode="issue.mode" /></div>
      </template>
    </IssueMediaImage>

    <div v-else class="relative aspect-[16/9] bg-muted/40">
      <div class="absolute inset-0 p-10 flex flex-col gap-3 justify-center">
        <div class="h-3 w-1/3 rounded bg-muted-foreground/15" />
        <div class="h-4 w-1/2 rounded bg-primary/25" />
        <div class="h-3 w-2/3 rounded bg-muted-foreground/10" />
      </div>
      <div class="absolute top-3 left-3"><TypeChip :mode="issue.mode" /></div>
    </div>
  </figure>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Issue, Attachment } from "@deveprobe/shared";
import TypeChip from "@/features/issues/components/TypeChip.vue";
import IssueMediaImage from "@/features/issues/components/IssueMediaImage.vue";
import IssueMediaVideo from "@/features/issues/components/IssueMediaVideo.vue";

const props = defineProps<{
  issue:       Issue;
  attachments: Attachment[];
}>();

// Recording mode → prefer video; screenshot/annotation → prefer image.
const heroVideoId = computed(() => {
  if (props.issue.mode !== "screen_recording") return null;
  return props.attachments.find((a) => a.type === "video")?.id ?? null;
});

const heroImageId = computed(() => {
  if (heroVideoId.value) return null;
  return props.attachments.find((a) => a.type === "screenshot" || a.type === "thumbnail")?.id ?? null;
});
</script>
