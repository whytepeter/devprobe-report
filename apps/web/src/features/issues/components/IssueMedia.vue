<!--
  IssueMedia
  ──────────
  Hero card showing the issue's primary capture (screenshot for now; recording
  thumbnail / pin canvas later). Type chip overlays the top-left corner.
-->
<template>
  <figure class="rounded-2xl border border-border bg-card overflow-hidden">
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
        :alt="issue.title"
        class="w-full h-full object-contain bg-background"
        loading="lazy"
        @error="imageBroken = true"
      />

      <div v-else-if="url && imageBroken" class="absolute inset-0 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
        <Icon name="image-off" :size="22" :stroke-width="1.5" />
        <span>Capture file is unreadable</span>
      </div>

      <div v-else class="absolute inset-0 p-10 flex flex-col gap-3 justify-center">
        <div class="h-3 w-1/3 rounded bg-muted-foreground/15" />
        <div class="h-4 w-1/2 rounded bg-primary/25" />
        <div class="h-3 w-2/3 rounded bg-muted-foreground/10" />
      </div>

      <div class="absolute top-3 left-3">
        <TypeChip :mode="issue.mode" />
      </div>
    </div>
  </figure>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { Issue, Attachment } from "@deveprobe/shared";
import { Icon } from "@deveprobe/ui";
import TypeChip from "@/features/issues/components/TypeChip.vue";
import { useAttachmentUrl } from "@/features/issues/composables/useAttachmentUrl.js";

const props = defineProps<{
  issue: Issue;
  attachments: Attachment[];
}>();

const heroAttachmentId = computed(() => {
  const att = props.attachments.find(
    (a) => a.type === "screenshot" || a.type === "thumbnail",
  );
  return att?.id ?? null;
});

const { url, loading, error } = useAttachmentUrl(() => heroAttachmentId.value);

const imageBroken = ref(false);
watch(url, () => { imageBroken.value = false; });
</script>
