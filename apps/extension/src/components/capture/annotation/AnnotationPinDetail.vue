<!--
  AnnotationPinDetail
  ───────────────────
  Read-only popover that opens when a user clicks an existing pin while in
  VIEW mode. Shows the pin's stored comment + severity + issue type, with a
  "View issue" deep-link into the web app for full context (activity feed,
  assignee, etc.).

  Positioning mirrors AnnotationPinComposer — popover sits ~24px below the
  pin, flips above when it would overflow the viewport.

  Composer + Detail intentionally live in separate files: Composer is a
  write surface (form fields, validation, busy state); Detail is a read
  surface (immutable fields, just an "open in dashboard" exit). Keeping them
  apart means future v2 detail features (replies, status change inline,
  reactions) don't have to fight composer's form state machine.
-->
<template>
  <div
    class="absolute z-[2147483646] w-[280px] -translate-x-1/2 select-text pointer-events-auto"
    :style="popoverStyle"
    @click.stop
  >
    <div class="rounded-xl border border-border bg-card shadow-[0_16px_40px_rgba(0,0,0,0.16),0_2px_8px_rgba(0,0,0,0.08)] overflow-hidden">
      <header class="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <span class="flex items-center gap-1.5 text-[11px] font-semibold text-foreground/85">
          <Icon name="map-pin" :size="12" :stroke-width="2" class="text-amber-500" />
          Pin #{{ index }}
          <span :class="['ml-1.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide', severityClass]">
            {{ severity ?? '—' }}
          </span>
        </span>
        <button
          type="button"
          class="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Close pin detail"
          @click="emit('close')"
        >
          <Icon name="x" :size="12" :stroke-width="2" />
        </button>
      </header>

      <div class="space-y-2 p-3">
        <p
          v-if="title"
          class="text-[13px] font-semibold leading-snug text-foreground"
        >{{ title }}</p>
        <p
          v-if="summary"
          class="whitespace-pre-wrap text-[12.5px] leading-relaxed text-foreground/80"
        >{{ summary }}</p>
        <p v-if="issueType" class="text-[11px] text-muted-foreground">
          <span class="font-mono uppercase tracking-wide">{{ formatType(issueType) }}</span>
        </p>
      </div>

      <footer class="flex items-center justify-end gap-2 border-t border-border px-3 py-2">
        <Button variant="ghost" size="sm" @click="emit('close')">
          Close
        </Button>
        <Button variant="default" size="sm" class="gap-1.5" @click="emit('open')">
          <Icon name="external-link" :size="11" :stroke-width="2" />
          View issue
        </Button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Button, Icon } from '@deveprobe/ui';
import type { Severity } from '@deveprobe/shared';

const props = defineProps<{
  index:     number;
  pageX:     number;
  pageY:     number;
  title:     string;
  summary:   string | null;
  severity:  Severity | null;
  issueType: string | null;
}>();

const emit = defineEmits<{ close: []; open: [] }>();

// Position-flip logic mirrors the composer's so they read as one family.
const POPOVER_HEIGHT_ESTIMATE = 220;
const popoverStyle = computed<Record<string, string>>(() => {
  const viewportBottom = window.scrollY + window.innerHeight;
  const wouldOverflow = props.pageY + 24 + POPOVER_HEIGHT_ESTIMATE > viewportBottom;
  if (wouldOverflow) {
    return {
      left: `${props.pageX}px`,
      top:  `${props.pageY - 24}px`,
      transform: 'translate(-50%, -100%)',
    };
  }
  return {
    left: `${props.pageX}px`,
    top:  `${props.pageY + 24}px`,
    transform: 'translateX(-50%)',
  };
});

const severityClass = computed(() => {
  switch (props.severity) {
    case 'critical': return 'bg-rose-500/15 text-rose-600 dark:text-rose-300';
    case 'high':     return 'bg-orange-500/15 text-orange-600 dark:text-orange-300';
    case 'medium':   return 'bg-amber-500/15 text-amber-600 dark:text-amber-300';
    case 'low':      return 'bg-neutral-500/15 text-muted-foreground';
    default:         return 'bg-muted text-muted-foreground';
  }
});

function formatType(raw: string): string {
  return raw.replace(/_/g, ' ');
}
</script>
