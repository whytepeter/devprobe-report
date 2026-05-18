<!--
  IssueMediaImage
  ───────────────
  Hero image renderer. Fetches the attachment blob through the authed API
  and binds it to <img>. Used when the issue's primary media is a screenshot
  or thumbnail.
-->
<template>
  <div class="relative aspect-[16/9] bg-muted/40">
    <div v-if="loading" class="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
      Loading capture…
    </div>

    <div
      v-else-if="error"
      class="absolute inset-0 flex items-center justify-center text-xs text-destructive px-6 text-center"
    >
      {{ error }}
    </div>

    <img
      v-else-if="url && !imageBroken"
      :src="url"
      :alt="alt"
      class="h-full w-full object-contain bg-background"
      loading="lazy"
      @error="imageBroken = true"
    />

    <div
      v-else-if="url && imageBroken"
      class="absolute inset-0 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground"
    >
      <Icon name="image-off" :size="22" :stroke-width="1.5" />
      <span>Capture file is unreadable</span>
    </div>

    <slot name="overlay" />
  </div>
</template>

<script setup lang="ts">
import { ref, toRef, watch } from "vue";
import { Icon } from "@deveprobe/ui";
import { useAttachmentUrl } from "@/features/issues/composables/useAttachmentUrl.js";

const props = defineProps<{
  attachmentId: string;
  alt?:         string;
}>();

const id = toRef(props, "attachmentId");
const { url, loading, error } = useAttachmentUrl(() => id.value);

const imageBroken = ref(false);
watch(url, () => { imageBroken.value = false; });
</script>
