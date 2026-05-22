<!--
  RecordingResumeBanner
  ─────────────────────
  Tiny floating banner mounted by the content script when a recording was
  interrupted by a page reload/navigation. Clicking Resume produces the user
  gesture chrome.tabCapture.getMediaStreamId needs to mint a fresh stream.

  Pill visual matches the recording toolbar so the user reads it as part of
  the same flow.
-->
<template>
  <div
    class="fixed left-1/2 top-4 z-[2147483646] -translate-x-1/2 pointer-events-auto
           flex items-center gap-2 rounded-full bg-[#111]/85 backdrop-blur-md
           px-3 py-1.5 text-white shadow-[0_10px_40px_rgba(0,0,0,0.35),0_0_0_1px_rgba(255,255,255,0.08)]"
  >
    <span class="inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse" aria-hidden="true" />
    <span class="text-[12px] font-medium">Recording paused</span>
    <span class="text-[11px] text-white/40">·</span>
    <button
      type="button"
      class="text-[12px] font-semibold text-violet-300 hover:text-violet-200 transition-colors"
      :disabled="busy"
      @click="onResume"
    >
      {{ busy ? 'Resuming…' : 'Resume' }}
    </button>
    <span class="text-[11px] text-white/40">·</span>
    <button
      type="button"
      class="text-[12px] text-white/60 hover:text-white transition-colors"
      :disabled="busy"
      @click="emit('discard')"
    >
      Discard
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{
  resume:  [];
  discard: [];
}>();

const busy = ref(false);

async function onResume() {
  if (busy.value) return;
  busy.value = true;
  emit('resume');
  // Parent owns the actual transition; if it fails we'll re-render via state.
  setTimeout(() => { busy.value = false; }, 4000);
}
</script>
