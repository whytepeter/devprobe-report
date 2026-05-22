<!--
  RecordingView
  ─────────────
  Hero card for `mode === 'screen_recording'` issues — just the custom
  video player (controls + error-marker timeline).

  The side panel (Info / Console / Network / Actions) is rendered at the
  page level (IssuePage), NOT here, so it hangs off the page edge instead
  of being wedged into the video card.

  Responsibilities (kept narrow):
    • Locate the hero video attachment.
    • Pass the events stream into the player for error markers.
    • Expose seekTo(ms) so IssuePage can bridge side-panel clicks.
-->
<template>
  <RecordingVideoPlayer
    v-if="heroVideoId"
    ref="playerRef"
    :attachment-id="heroVideoId"
    :events="events"
  />
  <div
    v-else
    class="aspect-video flex items-center justify-center rounded-2xl border border-border bg-muted/40 text-xs text-muted-foreground"
  >
    Recording unavailable
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import type { Issue, Attachment, TimelineEvent } from "@deveprobe/shared";
import RecordingVideoPlayer from "@/features/issues/components/recording/RecordingVideoPlayer.vue";

const props = defineProps<{
  issue:       Issue;
  attachments: Attachment[];
  events:      TimelineEvent[];
}>();

// Recording attachments store the file as type 'video' (single segment) or
// as the first 'video' + several 'clip' continuations (multi-segment reload-
// recovered uploads). The hero player only plays the first; clips are
// reachable from the side panel's Info tab.
const heroVideoId = computed<string | null>(() =>
  props.attachments.find((a) => a.type === "video")?.id ?? null,
);

const playerRef = ref<InstanceType<typeof RecordingVideoPlayer> | null>(null);
function seekTo(ms: number) { playerRef.value?.seekTo(ms); }

defineExpose({ seekTo });

// `events` reserved for future use inside this component (e.g. an overlay).
// Currently it just flows through to the player.
void props.events;
</script>
