<!--
  RecordingPanel
  ──────────────
  Thin coordinator for the recording review left-panel.

  Delegates rendering to:
  - RecordingVideo    — <video> element + overlays (exposes videoEl)
  - RecordingTimeline — waveform scrubber with event markers
  - RecordingControls — playback controls row
-->
<template>
  <div class="relative flex h-full w-full flex-col overflow-hidden bg-[#111] font-sans text-white select-none">

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

    <RecordingTimeline
      :progress="progress"
      :duration-ms="durationMs"
      :markers="markers ?? []"
      @seek="seekToPercent"
      @seek-to-ms="seekToMs"
    />

    <RecordingControls
      :is-playing="isPlaying"
      :is-muted="isMuted"
      :playback-rate="playbackRate"
      :current-time-sec="currentTimeSec"
      :duration-ms="durationMs"
      :issue-count="issueMarkers.length"
      :avg-response-label="avgResponseLabel"
      @toggle-play="togglePlay"
      @skip="skip"
      @toggle-mute="toggleMute"
      @cycle-speed="cycleSpeed"
      @prev-issue="prevIssue"
      @next-issue="nextIssue"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import RecordingVideo    from './RecordingVideo.vue';
import RecordingTimeline from './RecordingTimeline.vue';
import RecordingControls from './RecordingControls.vue';
import { useRecordingPlayback } from './useRecordingPlayback.js';
import type { RecordingMarker, MarkerType } from './types.js';

const props = withDefaults(defineProps<{
  videoSrc?:      string;
  durationMs:     number;
  pageUrl?:       string;
  markers?:       RecordingMarker[];
  avgResponseMs?: number;
}>(), {
  markers: () => [],
});

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

// ── Avg response label ─────────────────────────────────────────────────────
const avgResponseLabel = computed(() => {
  if (!props.avgResponseMs) return undefined;
  return props.avgResponseMs >= 1000
    ? (props.avgResponseMs / 1000).toFixed(1) + 's'
    : props.avgResponseMs + 'ms';
});
</script>
