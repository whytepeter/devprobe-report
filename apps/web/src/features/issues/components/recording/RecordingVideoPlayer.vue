<!--
  RecordingVideoPlayer
  ────────────────────
  Custom replay surface for screen-recording issues. Replaces the native
  `<video controls>` so we can:
    • Draw error markers on the scrub bar (timeline component).
    • Match the rest of the issue page chrome (dark frame, violet accent).
    • Surface playback rate + a fullscreen affordance.
    • Expose seekTo(ms) to the side panel for click-to-seek from rows.

  Composition:
    ┌─ <video>  (controls hidden, frame painted by us) ───────┐
    │                                                          │
    └──────────────────────────────────────────────────────────┘
       ─────●─────●──────────────●─────────────────  ← timeline (markers)
       ▶  0:12 / 1:30                1× 🔊 ⛶          ← controls

  Markers derive from the events stream:
    • console.error                              → red dot
    • network status === 0 or status ≥ 400       → red dot
    • slow network (durationMs > 1000)           → amber dot
-->
<template>
  <div class="relative overflow-hidden rounded-2xl bg-black">
    <!-- Video frame -->
    <div
      class="relative aspect-video bg-black"
      @click="playback.toggle"
    >
      <video
        v-if="url"
        ref="videoEl"
        :src="url"
        preload="metadata"
        playsinline
        class="h-full w-full object-contain"
      />
      <div
        v-else-if="loading"
        class="absolute inset-0 flex items-center justify-center text-white/50 text-xs"
      >
        Loading recording…
      </div>
      <div
        v-else-if="error"
        class="absolute inset-0 flex items-center justify-center px-6 text-center text-xs text-rose-300"
      >
        {{ error }}
      </div>

      <!-- Big play overlay (paused state) — only when we actually have a source. -->
      <button
        v-if="url && !playback.isPlaying.value"
        type="button"
        class="absolute inset-0 flex items-center justify-center text-white/90 hover:text-white transition-colors"
        aria-label="Play"
        @click.stop="playback.play"
      >
        <span class="flex h-14 w-14 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
          <Icon name="play" :size="22" :stroke-width="2" class="ml-0.5" />
        </span>
      </button>
    </div>

    <!-- Custom control surface -->
    <div class="bg-black/95 px-3 pb-2 pt-3">
      <RecordingVideoTimeline
        :progress="playback.progress.value"
        :duration-ms="playback.durationMs.value"
        :markers="markers"
        @seek="playback.seekToPct($event)"
        @seek-to-ms="playback.seekTo($event)"
      />
      <RecordingVideoControls
        :is-playing="playback.isPlaying.value"
        :current-ms="playback.currentMs.value"
        :duration-ms="playback.durationMs.value"
        :rate="playback.rate.value"
        :muted="playback.muted.value"
        @toggle="playback.toggle"
        @cycle-rate="playback.cycleRate"
        @toggle-mute="playback.toggleMute"
        @fullscreen="playback.requestFullscreen"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Icon } from '@deveprobe/ui';
import RecordingVideoTimeline, { type VideoMarker } from './RecordingVideoTimeline.vue';
import RecordingVideoControls from './RecordingVideoControls.vue';
import { usePlayback } from './usePlayback.js';
import { useAttachmentUrl } from '@/features/issues/composables/useAttachmentUrl.js';
import type { TimelineEvent } from '@deveprobe/shared';

const props = defineProps<{
  /** Attachment id for the hero video — fetched via the authed blob endpoint. */
  attachmentId: string;
  /** Full event stream for the issue — we filter to error/warning signals. */
  events:       TimelineEvent[];
}>();

const videoEl = ref<HTMLVideoElement | null>(null);
const playback = usePlayback(videoEl);

// Authed blob URL — same composable IssueMediaVideo uses. The composable
// takes a getter (not a Ref) so it can re-fetch whenever the id changes.
const { url, loading, error } = useAttachmentUrl(() => props.attachmentId);

// ── Error markers (errors + slow network) ───────────────────────────────────
const SLOW_REQUEST_MS = 1000;
const markers = computed<VideoMarker[]>(() => {
  const out: VideoMarker[] = [];
  for (const e of props.events) {
    if (e.kind === 'error') {
      out.push({ id: e.id, timestampMs: e.timestampMs, type: 'error', label: e.summary });
      continue;
    }
    if (e.kind === 'console' && (e.data as { level?: string })?.level === 'error') {
      out.push({ id: e.id, timestampMs: e.timestampMs, type: 'error', label: e.summary });
      continue;
    }
    if (e.kind === 'network') {
      const data = (e.data ?? {}) as { status?: number; durationMs?: number };
      const status = data.status ?? 0;
      if (status === 0 || status >= 400) {
        out.push({ id: e.id, timestampMs: e.timestampMs, type: 'error', label: e.summary });
      } else if ((data.durationMs ?? 0) > SLOW_REQUEST_MS) {
        out.push({ id: e.id, timestampMs: e.timestampMs, type: 'warning', label: e.summary });
      }
    }
  }
  return out;
});

// Exposed so the side panel can scrub via clicks in Console/Network tabs.
defineExpose({ seekTo: playback.seekTo });
</script>
