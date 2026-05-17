<!--
  AttachmentImage
  ───────────────
  Fetches one attachment's blob through the authed API client and binds it
  via URL.createObjectURL so it can be rendered inside an <img>.
-->
<template>
  <figure
    class="rounded-lg border border-border bg-muted/30 overflow-hidden"
  >
    <div
      v-if="loading"
      class="aspect-video flex items-center justify-center text-xs text-muted-foreground"
    >
      Loading screenshot…
    </div>

    <div
      v-else-if="error"
      class="aspect-video flex items-center justify-center text-xs text-destructive px-3 text-center"
    >
      {{ error }}
    </div>

    <a
      v-else-if="url && !imageBroken"
      :href="url"
      target="_blank"
      rel="noopener"
      class="block"
    >
      <img
        :src="url"
        :alt="attachment.type"
        class="block w-full h-auto"
        loading="lazy"
        @error="imageBroken = true"
      />
    </a>

    <div
      v-else-if="url && imageBroken"
      class="aspect-video flex flex-col items-center justify-center gap-1.5 text-xs text-muted-foreground"
    >
      <Icon name="image-off" :size="20" :stroke-width="1.5" />
      <span>File is unreadable</span>
    </div>

    <figcaption class="px-3 py-2 flex items-center justify-between gap-2 border-t border-border bg-card">
      <span class="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {{ attachment.type }}
      </span>
      <span class="text-[11px] font-mono text-muted-foreground/80">
        {{ formatSize(attachment.sizeBytes) }}
      </span>
    </figcaption>
  </figure>
</template>

<script setup lang="ts">
import { ref, toRef, watch } from "vue";
import type { Attachment } from "@deveprobe/shared";
import { Icon } from "@deveprobe/ui";
import { useAttachmentUrl } from "@/features/issues/composables/useAttachmentUrl.js";

const props = defineProps<{ attachment: Attachment }>();

const attachmentId = toRef(props.attachment, "id");
const { url, loading, error } = useAttachmentUrl(() => attachmentId.value);

const imageBroken = ref(false);
watch(url, () => { imageBroken.value = false; });

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
</script>
