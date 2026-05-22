<!--
  IssueMediaVideo
  ───────────────
  Hero video player for screen recordings. Fetches the attachment blob via
  the authed API client and binds it to <video controls>.
-->
<template>
  <div class="relative aspect-[16/9] bg-black">
    <div v-if="loading" class="absolute inset-0 flex items-center justify-center text-xs text-white/60">
      Loading recording…
    </div>

    <div
      v-else-if="error"
      class="absolute inset-0 flex items-center justify-center text-xs text-destructive px-6 text-center"
    >
      {{ error }}
    </div>

    <video
      v-else-if="url"
      ref="videoEl"
      :src="url"
      controls
      preload="metadata"
      class="h-full w-full object-contain bg-black"
    />

    <slot name="overlay" />
  </div>
</template>

<script setup lang="ts">
import { ref, toRef } from "vue";
import { useAttachmentUrl } from "@/features/issues/composables/useAttachmentUrl.js";

const props = defineProps<{ attachmentId: string }>();

const id = toRef(props, "attachmentId");
const { url, loading, error } = useAttachmentUrl(() => id.value);

const videoEl = ref<HTMLVideoElement | null>(null);

/** Seek the video to a recording timestamp in milliseconds. */
function seekTo(ms: number) {
  const el = videoEl.value;
  if (!el) return;
  el.currentTime = Math.max(0, ms / 1000);
  // If paused, play from the seeked position
  if (el.paused) el.play().catch(() => null);
}

defineExpose({ seekTo });
</script>
