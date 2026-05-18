<!--
  RecordingControls
  ─────────────────
  Toolbar row sitting between the video card and the trimmer (light theme).
  Fully controlled — all state in via props, all actions out via emits.

  Layout (left → right):
    skip-back₅ | play/pause | skip-forward₅ | timestamp | issue-nav |
    [spacer] | ✂ trim-duration | speed | volume
-->
<template>
  <div class="flex shrink-0 items-center gap-1 px-4 py-2.5">

    <!-- Skip back 5s -->
    <button
      class="relative flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      title="Skip back 5s"
      @click="emit('skip', -5)"
    >
      <Icon name="skip-back" :size="15" />
      <span class="absolute bottom-0.5 right-1 text-[8px] font-mono leading-none text-muted-foreground/70">5</span>
    </button>

    <!-- Play / Pause -->
    <button
      class="flex h-8 w-8 items-center justify-center rounded-md bg-foreground text-background transition-colors hover:bg-foreground/85"
      @click="emit('toggle-play')"
    >
      <Icon :name="isPlaying ? 'pause' : 'play'" :size="14" />
    </button>

    <!-- Skip forward 5s -->
    <button
      class="relative flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      title="Skip forward 5s"
      @click="emit('skip', 5)"
    >
      <Icon name="skip-forward" :size="15" />
      <span class="absolute bottom-0.5 right-1 text-[8px] font-mono leading-none text-muted-foreground/70">5</span>
    </button>

    <!-- Timestamp -->
    <span class="mx-2 font-mono text-[12px] text-foreground/70">
      {{ formatTime(currentTimeSec) }}<span class="mx-0.5 text-muted-foreground/40">|</span>{{ formatDuration(durationMs) }}
    </span>

    <!-- Issue navigation pill -->
    <div
      v-if="issueCount > 0"
      class="mx-1 flex items-center gap-0.5 rounded-full bg-red-500/10 px-1.5 py-0.5"
    >
      <button
        class="flex h-5 w-5 items-center justify-center rounded text-red-400/70 transition-colors hover:bg-red-500/15 hover:text-red-300"
        @click="emit('prev-issue')"
      >
        <Icon name="chevron-left" :size="12" />
      </button>
      <span class="flex items-center gap-1 px-1 text-[11px] font-medium text-red-400">
        <span class="h-[5px] w-[5px] rounded-full bg-red-500" />
        {{ issueCount }} issue{{ issueCount !== 1 ? 's' : '' }}
      </span>
      <button
        class="flex h-5 w-5 items-center justify-center rounded text-red-400/70 transition-colors hover:bg-red-500/15 hover:text-red-300"
        @click="emit('next-issue')"
      >
        <Icon name="chevron-right" :size="12" />
      </button>
    </div>

    <div class="flex-1" />

    <!-- Trim duration pill -->
    <button
      v-if="trimDurationMs !== undefined"
      class="mr-1 flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/20"
      title="Trim duration"
    >
      <Icon name="scissors" :size="11" />
      {{ formatTrim(trimDurationMs) }}
    </button>

    <!-- Playback speed -->
    <button
      class="rounded-full bg-primary/15 px-2.5 py-0.5 font-mono text-[11px] font-medium text-primary transition-colors hover:bg-primary/20"
      @click="emit('cycle-speed')"
    >
      {{ playbackRate }}×
    </button>

    <!-- Volume / mute -->
    <button
      class="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      @click="emit('toggle-mute')"
    >
      <Icon :name="isMuted ? 'volume-x' : 'volume-2'" :size="14" />
    </button>

  </div>
</template>

<script setup lang="ts">
import { Icon } from '@deveprobe/ui';
import { formatTime, formatDuration } from '../utils.js';

defineProps<{
  isPlaying:       boolean;
  isMuted:         boolean;
  playbackRate:    number;
  currentTimeSec:  number;
  durationMs:      number;
  issueCount:      number;
  trimDurationMs?: number;
}>();

const emit = defineEmits<{
  'toggle-play':  [];
  'skip':         [seconds: number];
  'toggle-mute':  [];
  'cycle-speed':  [];
  'prev-issue':   [];
  'next-issue':   [];
}>();

function formatTrim(ms: number): string {
  return (ms / 1000).toFixed(1) + 's';
}
</script>
