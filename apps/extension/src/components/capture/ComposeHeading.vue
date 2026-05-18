<!--
  ComposeHeading
  ──────────────
  Top status strip rendered at the very top of the compose flow (above both
  the media panel and the form panel). Shared by screenshot and recording.

  Layout:
    ● NEW {mode} · 🎥 {duration?} · {pageUrl}        ⌫ Download   ↻ Regenerate

  Action buttons are only rendered when their corresponding listener is bound,
  keeping the screenshot flow visually minimal (no Download by default).
-->
<template>
  <div class="flex shrink-0 items-center gap-2 border-b border-border bg-card px-4 py-2.5">
    <span class="h-2 w-2 shrink-0 rounded-full bg-red-500" />
    <span class="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
      New {{ mode }}
    </span>

    <template v-if="durationMs !== undefined">
      <span class="text-muted-foreground/40">·</span>
      <span class="flex items-center gap-1 text-[11px] text-muted-foreground">
        <Icon name="video" :size="11" class="opacity-60" />
        {{ formatDuration(durationMs) }}
      </span>
    </template>

    <template v-if="shortUrl">
      <span class="text-muted-foreground/40">·</span>
      <span class="max-w-[280px] truncate text-[11px] text-muted-foreground/70">{{ shortUrl }}</span>
    </template>

    <div class="ml-auto flex items-center gap-1.5">
      <button
        v-if="showDownload"
        class="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium text-foreground/75 transition-colors hover:bg-muted hover:text-foreground"
        @click="emit('download')"
      >
        <Icon name="paperclip" :size="11" />
        Download
      </button>
      <button
        v-if="showRegenerate"
        class="flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors"
        :class="generating
          ? 'border-primary/30 bg-primary/10 text-primary'
          : 'border-border bg-background text-foreground/75 hover:bg-muted hover:text-foreground'"
        :disabled="generating"
        @click="emit('regenerate')"
      >
        <Icon :name="aiIcon" :size="11" />
        {{ aiLabel }}
        <span v-if="generating" class="text-primary/60 animate-pulse">···</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from '@deveprobe/ui';

const props = defineProps<{
  /** e.g. "Recording", "Screenshot". Rendered as `New {mode}`. */
  mode:            string;
  /** Only shown for recordings. */
  durationMs?:     number;
  pageUrl?:        string;
  /** True while the AI is running. Shows "Generating …". */
  generating?:     boolean;
  /** Set to true once the AI has generated content at least once.
      Drives the label swap "Generate" → "Regenerate". */
  hasGenerated?:   boolean;
  showDownload?:   boolean;
  showRegenerate?: boolean;
}>();

const emit = defineEmits<{
  download:   [];
  regenerate: [];
}>();

// Label flips: first time → "Generate", while running → "Generating",
// after a successful generation → "Regenerate".
const aiLabel = computed(() => {
  if (props.generating)   return 'Generating';
  if (props.hasGenerated) return 'Regenerate';
  return 'Generate';
});
const aiIcon = computed(() => (props.hasGenerated && !props.generating) ? 'refresh-cw' : 'sparkles');

const shortUrl = computed(() => {
  if (!props.pageUrl) return '';
  try {
    const u = new URL(props.pageUrl);
    return u.hostname + (u.pathname !== '/' ? u.pathname : '');
  } catch {
    return props.pageUrl;
  }
});

function formatDuration(ms: number): string {
  const totalSec = ms / 1000;
  const m        = Math.floor(totalSec / 60);
  const s        = Math.floor(totalSec % 60);
  const frac     = (totalSec - Math.floor(totalSec)).toFixed(1).slice(1);
  return `${m}:${String(s).padStart(2, '0')}${frac}`;
}
</script>
