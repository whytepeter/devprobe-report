<!--
  RecordingControls
  ─────────────────
  Playback controls row below the timeline.
  Fully controlled — all state comes in as props, all actions go out as emits.

  Layout (left → right):
    skip-back | play/pause | skip-forward | timestamp | issue-nav | [spacer] | avg-stat | speed | volume
-->
<template>
  <div class="flex shrink-0 items-center gap-1 px-3 pb-3">

    <!-- Skip back 5s -->
    <button
      class="flex h-7 w-7 items-center justify-center rounded-md text-white/45 transition-colors hover:bg-white/10 hover:text-white/80"
      title="Skip back 5s"
      @click="emit('skip', -5)"
    >
      <Icon name="skip-back" :size="14" />
    </button>

    <!-- Play / Pause -->
    <button
      class="flex h-7 w-7 items-center justify-center rounded-md text-white transition-colors hover:bg-white/10"
      @click="emit('toggle-play')"
    >
      <Icon :name="isPlaying ? 'pause' : 'play'" :size="14" />
    </button>

    <!-- Skip forward 5s -->
    <button
      class="flex h-7 w-7 items-center justify-center rounded-md text-white/45 transition-colors hover:bg-white/10 hover:text-white/80"
      title="Skip forward 5s"
      @click="emit('skip', 5)"
    >
      <Icon name="skip-forward" :size="14" />
    </button>

    <!-- Timestamp -->
    <span class="mx-1 font-mono text-[12px] text-white/55">
      {{ formatTime(currentTimeSec) }}<span class="mx-0.5 text-white/25">|</span>{{ formatDuration(durationMs) }}
    </span>

    <!-- Issue navigation -->
    <div v-if="issueCount > 0" class="mx-1 flex items-center gap-0.5">
      <button
        class="flex h-5 w-5 items-center justify-center rounded text-white/35 transition-colors hover:bg-white/10 hover:text-white/70"
        @click="emit('prev-issue')"
      >
        <Icon name="chevron-left" :size="12" />
      </button>
      <span class="flex items-center gap-1 px-1 text-[11px] text-white/55">
        <span class="h-[5px] w-[5px] rounded-full bg-red-400" />
        {{ issueCount }} issue{{ issueCount !== 1 ? 's' : '' }}
      </span>
      <button
        class="flex h-5 w-5 items-center justify-center rounded text-white/35 transition-colors hover:bg-white/10 hover:text-white/70"
        @click="emit('next-issue')"
      >
        <Icon name="chevron-right" :size="12" />
      </button>
    </div>

    <div class="flex-1" />

    <!-- Average response time stat (optional) -->
    <span
      v-if="avgResponseLabel"
      class="mr-1 flex items-center gap-1 text-[11px] text-white/35"
    >
      <Icon name="zap" :size="11" />
      {{ avgResponseLabel }}
    </span>

    <!-- Playback speed -->
    <button
      class="rounded px-1.5 py-0.5 font-mono text-[11px] text-white/45 transition-colors hover:bg-white/10 hover:text-white/70"
      @click="emit('cycle-speed')"
    >
      {{ playbackRate }}×
    </button>

    <!-- Volume / mute -->
    <button
      class="flex h-7 w-7 items-center justify-center rounded-md text-white/45 transition-colors hover:bg-white/10 hover:text-white/80"
      @click="emit('toggle-mute')"
    >
      <Icon :name="isMuted ? 'volume-x' : 'volume-2'" :size="14" />
    </button>

  </div>
</template>

<script setup lang="ts">
import { Icon } from '@deveprobe/ui';
import { formatTime, formatDuration } from './utils.js';

defineProps<{
  isPlaying:       boolean;
  isMuted:         boolean;
  playbackRate:    number;
  currentTimeSec:  number;
  durationMs:      number;
  issueCount:      number;
  avgResponseLabel?: string;
}>();

const emit = defineEmits<{
  'toggle-play':  [];
  'skip':         [seconds: number];
  'toggle-mute':  [];
  'cycle-speed':  [];
  'prev-issue':   [];
  'next-issue':   [];
}>();
</script>
