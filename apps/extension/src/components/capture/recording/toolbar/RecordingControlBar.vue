<!--
  RecordingControlBar
  ───────────────────
  Floating control rendered DURING screen recording (not review).

  Pinned to the bottom centre of the viewport. Shows:
  - Pulsing recording dot
  - Live timer (mm:ss)
  - Pause / resume
  - Blur a region of the page
  - Stop

  All actions are emitted; the content-script owns the MediaRecorder.
-->
<template>
  <div class="fixed bottom-6 left-1/2 z-[2147483646] -translate-x-1/2 font-sans pointer-events-auto">
    <div
      class="flex items-center gap-1.5 rounded-full bg-[#111]/85 backdrop-blur-md px-2.5 py-1.5 text-white shadow-[0_10px_40px_rgba(0,0,0,0.35),0_0_0_1px_rgba(255,255,255,0.08)]"
    >
      <!-- Recording dot -->
      <span
        class="ml-1.5 h-2 w-2 rounded-full bg-red-500"
        :class="{ 'animate-pulse': state === 'recording' }"
      />

      <!-- Timer -->
      <span class="px-1.5 font-mono text-[12px] tabular-nums text-white/90">
        {{ formatTimer(elapsedMs) }}
      </span>

      <span class="text-white/15">|</span>

      <!-- Pause / Resume -->
      <button
        class="flex h-7 w-7 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        :title="state === 'paused' ? 'Resume' : 'Pause'"
        @click="emit('toggle-pause')"
      >
        <Icon :name="state === 'paused' ? 'play' : 'pause'" :size="13" />
      </button>

      <!-- Blur a region -->
      <button
        class="flex h-7 w-7 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        title="Blur a region"
        @click="emit('add-blur')"
      >
        <Icon name="eye-off" :size="13" />
      </button>

      <!-- Stop -->
      <button
        class="ml-0.5 flex h-7 items-center gap-1.5 rounded-full bg-red-500 px-3 text-[11px] font-semibold text-white transition-colors hover:bg-red-600"
        title="Stop recording"
        @click="emit('stop')"
      >
        <span class="h-2 w-2 rounded-[2px] bg-white" />
        Stop
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@deveprobe/ui';

defineProps<{
  state:     'recording' | 'paused';
  elapsedMs: number;
}>();

const emit = defineEmits<{
  'toggle-pause': [];
  'add-blur':     [];
  'stop':         [];
}>();

function formatTimer(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
</script>
