<!--
  RecordingControlBar
  ───────────────────
  The recording toolbar PILL (timer + pause/resume + blur + stop). Position-
  agnostic: the FloatingLauncher renders it at the (draggable) FAB position
  while a recording is active — the launcher TRANSFORMS into this toolbar.

  All actions are emitted; the content-script owns the MediaRecorder.
-->
<template>
  <div class="font-sans">
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

      <!-- Blur a region (sticky — stays active until clicked again or Esc) -->
      <button
        class="flex h-7 w-7 items-center justify-center rounded-full transition-colors"
        :class="blurActive
          ? 'bg-violet-500 text-white hover:bg-violet-600 shadow-[0_0_0_2px_rgba(139,92,246,0.25)]'
          : 'text-white/70 hover:bg-white/10 hover:text-white'"
        :title="blurActive ? 'Stop blurring (or press Esc)' : 'Blur elements'"
        :aria-pressed="blurActive"
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
  state:       'recording' | 'paused';
  elapsedMs:   number;
  /** True while sticky element-blur pick mode is on. */
  blurActive?: boolean;
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
