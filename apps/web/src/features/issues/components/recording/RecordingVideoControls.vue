<!--
  RecordingVideoControls
  ──────────────────────
  Bottom row of the custom player: play/pause + time + rate + mute + fullscreen.

  Dumb component — emits intent ("play", "rate", …) that the player owner
  forwards into the usePlayback composable. Keeps this file free of any
  refs to the underlying <video>.
-->
<template>
  <div class="flex items-center gap-3 px-3 py-2 text-white">
    <!-- Play / pause -->
    <button
      type="button"
      class="flex h-7 w-7 items-center justify-center rounded-full text-white/90 hover:bg-white/10 transition-colors"
      :aria-label="isPlaying ? 'Pause' : 'Play'"
      @click="emit('toggle')"
    >
      <Icon :name="isPlaying ? 'pause' : 'play'" :size="14" :stroke-width="2" />
    </button>

    <!-- Current / total time -->
    <span class="font-mono text-[11px] tabular-nums text-white/85">
      {{ formatTime(currentMs) }}
      <span class="text-white/40">/</span>
      {{ formatTime(durationMs) }}
    </span>

    <!-- Right cluster -->
    <div class="ml-auto flex items-center gap-1">
      <!-- Playback rate — cycles 0.5 → 1 → 1.25 → 1.5 → 2 -->
      <button
        type="button"
        class="rounded-md px-2 py-1 font-mono text-[11px] text-white/80 hover:bg-white/10 transition-colors"
        aria-label="Playback speed"
        @click="emit('cycle-rate')"
      >
        {{ rate }}×
      </button>

      <button
        type="button"
        class="flex h-7 w-7 items-center justify-center rounded-md text-white/80 hover:bg-white/10 transition-colors"
        :aria-label="muted ? 'Unmute' : 'Mute'"
        @click="emit('toggle-mute')"
      >
        <Icon :name="muted ? 'volume-x' : 'volume-2'" :size="14" :stroke-width="1.75" />
      </button>

      <button
        type="button"
        class="flex h-7 w-7 items-center justify-center rounded-md text-white/80 hover:bg-white/10 transition-colors"
        aria-label="Fullscreen"
        @click="emit('fullscreen')"
      >
        <Icon name="maximize-2" :size="13" :stroke-width="1.75" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from "@deveprobe/ui";

defineProps<{
  isPlaying:  boolean;
  currentMs:  number;
  durationMs: number;
  rate:       number;
  muted:      boolean;
}>();

const emit = defineEmits<{
  toggle:       [];
  'cycle-rate': [];
  'toggle-mute':[];
  fullscreen:   [];
}>();

/** `mm:ss` / `h:mm:ss` for long recordings. */
function formatTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
</script>
