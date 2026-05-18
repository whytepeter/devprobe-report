<!--
  RecordingVideo
  ──────────────
  Video player area: <video> element, timestamp pill, and a centred play/pause
  overlay that appears on hover.

  - Timestamp pill sits in the TOP-RIGHT corner.
  - Hover anywhere over the video reveals the play/pause control; clicking
    toggles playback.
  - Exposes the underlying HTMLVideoElement via defineExpose so the parent
    composable can drive it.
-->
<template>
  <div
    class="group relative h-full w-full cursor-pointer overflow-hidden bg-black"
    @click="onAreaClick"
    @mouseenter="hovering = true"
    @mouseleave="hovering = false"
  >
    <video
      v-if="videoSrc"
      ref="videoEl"
      class="h-full w-full object-contain"
      :src="videoSrc"
      preload="metadata"
      @timeupdate="emit('time-update')"
      @loadedmetadata="emit('loaded-metadata')"
      @play="emit('play')"
      @pause="emit('pause')"
      @ended="emit('ended')"
    />

    <!-- Placeholder when no recording src is available -->
    <div v-else class="flex h-full items-center justify-center">
      <div class="flex flex-col items-center gap-3 text-white/20">
        <Icon name="video-off" :size="32" class="opacity-40" />
        <span class="text-[12px]">No recording</span>
      </div>
    </div>

    <!-- Timestamp pill (top-right) -->
    <div
      class="pointer-events-none absolute top-3 right-3 rounded-md bg-black/75 px-2.5 py-1 font-mono text-[13px] font-medium text-white/90"
    >
      {{ formatTime(currentTimeSec) }}
      <span class="mx-0.5 text-white/40">/</span>
      {{ formatDuration(durationMs) }}
    </div>

    <!-- Hover play/pause control -->
    <Transition
      enter-active-class="transition-all duration-150 ease-out"
      enter-from-class="opacity-0 scale-90"
      leave-active-class="transition-all duration-150 ease-in"
      leave-to-class="opacity-0 scale-90"
    >
      <div
        v-if="hovering"
        class="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div class="flex h-14 w-14 items-center justify-center rounded-full bg-black/55 ring-1 ring-white/20 backdrop-blur-sm">
          <Icon :name="isPlaying ? 'pause' : 'play'" :size="22" class="text-white" />
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Icon } from '@deveprobe/ui';
import { formatTime, formatDuration } from './utils.js';

defineProps<{
  videoSrc?:      string;
  isPlaying:      boolean;
  currentTimeSec: number;
  durationMs:     number;
}>();

const emit = defineEmits<{
  'toggle-play':     [];
  'time-update':     [];
  'loaded-metadata': [];
  'play':            [];
  'pause':           [];
  'ended':           [];
}>();

const videoEl  = ref<HTMLVideoElement | null>(null);
const hovering = ref(false);

function onAreaClick() {
  emit('toggle-play');
}

defineExpose({ videoEl });
</script>
