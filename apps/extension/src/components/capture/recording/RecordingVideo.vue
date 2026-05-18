<!--
  RecordingVideo
  ──────────────
  Video player area: <video> element, timestamp pill, and a click-to-play
  overlay that briefly flashes the play/pause icon.

  The component owns the HTMLVideoElement ref and exposes it so the parent
  can hand it to useRecordingPlayback via a getter.

  Native video events (timeupdate, loadedmetadata, play, pause, ended) are
  forwarded as Vue emits so the parent composable can react without needing
  direct access to the element during setup.
-->
<template>
  <div
    class="relative flex-1 min-h-0 cursor-pointer overflow-hidden bg-black"
    @click="onAreaClick"
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

    <!-- Timestamp pill -->
    <div
      class="pointer-events-none absolute bottom-3 right-3 rounded-md bg-black/75 px-2.5 py-1 font-mono text-[13px] font-medium text-white/90"
    >
      {{ formatTime(currentTimeSec) }}
      <span class="mx-0.5 text-white/40">/</span>
      {{ formatDuration(durationMs) }}
    </div>

    <!-- Play/pause flash overlay -->
    <Transition
      enter-active-class="transition-all duration-150 ease-out"
      enter-from-class="opacity-0 scale-90"
      leave-active-class="transition-all duration-100 ease-in"
      leave-to-class="opacity-0 scale-90"
    >
      <div
        v-if="showOverlay"
        class="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div class="flex h-14 w-14 items-center justify-center rounded-full bg-black/55 ring-1 ring-white/20">
          <!-- Icon reflects the action just triggered: if playing→pause, if paused→play -->
          <Icon :name="isPlaying ? 'pause' : 'play'" :size="22" />
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue';
import { Icon } from '@deveprobe/ui';
import { formatTime, formatDuration } from './utils.js';

defineProps<{
  videoSrc?:      string;
  isPlaying:      boolean;
  currentTimeSec: number;
  durationMs:     number;
}>();

const emit = defineEmits<{
  'toggle-play':    [];
  'time-update':    [];
  'loaded-metadata': [];
  'play':           [];
  'pause':          [];
  'ended':          [];
}>();

const videoEl    = ref<HTMLVideoElement | null>(null);
const showOverlay = ref(false);
let overlayTimer: ReturnType<typeof setTimeout> | null = null;

function onAreaClick() {
  showOverlay.value = true;
  if (overlayTimer) clearTimeout(overlayTimer);
  overlayTimer = setTimeout(() => { showOverlay.value = false; }, 600);
  emit('toggle-play');
}

onUnmounted(() => {
  if (overlayTimer) clearTimeout(overlayTimer);
});

defineExpose({ videoEl });
</script>
