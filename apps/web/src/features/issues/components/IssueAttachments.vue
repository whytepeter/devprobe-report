<!--
  IssueAttachments
  ────────────────
  Renders the image-shaped attachments (screenshot / thumbnail) for an issue
  in a responsive grid. Non-image types are listed compactly below.
-->
<template>
  <section v-if="attachments.length" class="space-y-3">
    <h2 class="text-[10px] uppercase tracking-wide text-muted-foreground/70">
      Attachments
    </h2>

    <div v-if="images.length" class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <AttachmentImage
        v-for="a in images"
        :key="a.id"
        :attachment="a"
      />
    </div>

    <ul v-if="others.length" class="space-y-1.5">
      <li
        v-for="a in others"
        :key="a.id"
        class="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2"
      >
        <span class="text-xs font-medium text-foreground">{{ a.type }}</span>
        <span class="font-mono text-[10px] text-muted-foreground">{{ a.contentType }}</span>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Attachment } from "@deveprobe/shared";
import AttachmentImage from "@/features/issues/components/AttachmentImage.vue";

const props = defineProps<{ attachments: Attachment[] }>();

const IMAGE_TYPES = new Set(["screenshot", "thumbnail"]);

const images = computed(() => props.attachments.filter((a) => IMAGE_TYPES.has(a.type)));
const others = computed(() => props.attachments.filter((a) => !IMAGE_TYPES.has(a.type)));
</script>
