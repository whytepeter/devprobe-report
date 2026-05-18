<!--
  RecordingActiveView
  ───────────────────
  Popup view shown while a screen recording is in progress on the active tab.
  Replaces the ActionList. Shows a pulsing dot, live timer, target URL, and a
  primary Stop button that bridges to the content script via the runtime.
-->
<template>
  <div class="px-3 py-3 space-y-3">
    <div class="rounded-xl border border-border bg-muted/30 px-3 py-2.5 space-y-1.5">
      <div class="flex items-center gap-2">
        <span class="h-2 w-2 shrink-0 rounded-full bg-red-500 animate-pulse" />
        <span class="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Recording</span>
        <span class="ml-auto font-mono text-[12px] tabular-nums text-foreground/80">
          {{ formatTimer(elapsedMs) }}
        </span>
      </div>
      <p v-if="shortUrl" class="truncate text-[11px] text-muted-foreground/70 font-mono">
        {{ shortUrl }}
      </p>
    </div>

    <Button variant="default" class="w-full gap-1.5" @click="emit('stop')">
      <span class="h-2 w-2 rounded-[2px] bg-primary-foreground" />
      Stop recording
    </Button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Button } from '@deveprobe/ui';

const props = defineProps<{
  elapsedMs: number;
  pageUrl?:  string;
}>();

const emit = defineEmits<{ stop: [] }>();

const shortUrl = computed(() => {
  if (!props.pageUrl) return '';
  try {
    const u = new URL(props.pageUrl);
    return u.hostname + (u.pathname !== '/' ? u.pathname : '');
  } catch {
    return props.pageUrl;
  }
});

function formatTimer(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
</script>
