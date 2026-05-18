<!--
  RecordingPanel
  ──────────────
  Thin coordinator for the recording review left-panel.

  Layout (top → bottom):
    1. Video — inside its own rounded card with a soft border
    2. Toolbar (RecordingControls) — separate row on the light background
    3. Trimmer (RecordingTimeline) — at the very bottom

  The panel uses the modal's light card colour so the video and the form
  read as one continuous surface.
-->
<template>
  <div class="relative flex h-full w-full flex-col overflow-hidden bg-card font-sans text-foreground select-none">

    <!-- Video card (inset on dark panel) -->
    <div class="flex-1 min-h-0 px-4 pt-4 pb-2">
      <div class="relative h-full overflow-hidden rounded-xl border border-border bg-background shadow-sm">
        <RecordingVideo
          ref="videoComp"
          :video-src="videoSrc"
          :is-playing="isPlaying"
          :current-time-sec="currentTimeSec"
          :duration-ms="durationMs"
          @toggle-play="togglePlay"
          @time-update="onTimeUpdate"
          @loaded-metadata="onLoadedMetadata"
          @play="onPlay"
          @pause="onPause"
          @ended="onEnded"
        />
      </div>
    </div>

    <!-- Toolbar -->
    <RecordingControls
      :is-playing="isPlaying"
      :is-muted="isMuted"
      :playback-rate="playbackRate"
      :current-time-sec="currentTimeSec"
      :duration-ms="durationMs"
      :trim-duration-ms="trimDurationMs"
      :issue-count="issueMarkers.length"
      @toggle-play="togglePlay"
      @skip="skip"
      @toggle-mute="toggleMute"
      @cycle-speed="cycleSpeed"
      @prev-issue="prevIssue"
      @next-issue="nextIssue"
    />

    <!-- Trimmer (at the bottom) -->
    <RecordingTimeline
      :progress="progress"
      :duration-ms="durationMs"
      :markers="markers ?? []"
      :trim-start-ms="trimStartMs"
      :trim-end-ms="trimEndMs"
      @seek="seekToPercent"
      @seek-to-ms="seekToMs"
      @update:trim-start="trimStartMs = $event"
      @update:trim-end="trimEndMs = $event"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import RecordingVideo    from './RecordingVideo.vue';
import RecordingTimeline from './timeline/RecordingTimeline.vue';
import RecordingControls from './toolbar/RecordingControls.vue';
import { useRecordingPlayback } from './useRecordingPlayback.js';
import type { RecordingMarker, MarkerType } from './types.js';

const props = withDefaults(defineProps<{
  videoSrc?:  string;
  durationMs: number;
  markers?:   RecordingMarker[];
}>(), {
  markers: () => [],
});

// ── Trim state ─────────────────────────────────────────────────────────────
const trimStartMs    = ref(0);
const trimEndMs      = ref(props.durationMs);
const trimDurationMs = computed(() => Math.max(0, trimEndMs.value - trimStartMs.value));

// ── Playback ───────────────────────────────────────────────────────────────
const videoComp = ref<InstanceType<typeof RecordingVideo>>();

const {
  currentTimeSec, isPlaying, isMuted, playbackRate, progress,
  togglePlay, skip, seekToMs, seekToPercent,
  toggleMute, cycleSpeed,
  onTimeUpdate, onLoadedMetadata, onPlay, onPause, onEnded,
} = useRecordingPlayback(
  () => videoComp.value?.videoEl ?? null,
  () => props.durationMs / 1000,
);

// ── Issue navigation ───────────────────────────────────────────────────────
const ISSUE_TYPES: MarkerType[] = ['error', 'warning', 'network_fail', 'network_slow'];

const issueMarkers = computed(() =>
  [...(props.markers ?? [])]
    .filter(m => ISSUE_TYPES.includes(m.type))
    .sort((a, b) => a.timestampMs - b.timestampMs),
);

const issueIndex = ref(0);

function nextIssue() {
  if (!issueMarkers.value.length) return;
  issueIndex.value = (issueIndex.value + 1) % issueMarkers.value.length;
  seekToMs(issueMarkers.value[issueIndex.value].timestampMs);
}

function prevIssue() {
  if (!issueMarkers.value.length) return;
  issueIndex.value = (issueIndex.value - 1 + issueMarkers.value.length) % issueMarkers.value.length;
  seekToMs(issueMarkers.value[issueIndex.value].timestampMs);
}
</script>
