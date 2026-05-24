<!--
  AnnotationPinDetail
  ───────────────────
  Popover opened when a user clicks an existing pin in VIEW mode. Shows the
  pin's comment + severity + issue type, lets a reviewer change status inline
  (re-colours the marker), and deep-links into the dashboard.

  Stale anchors: when the pin's element can't be re-resolved on the current
  page, the popover surfaces a notice + a "Re-anchor" action so the reviewer
  can point the pin at the element again.

  Positioning mirrors AnnotationPinComposer (flip above when it would overflow
  the viewport bottom). pageX/pageY are VIEWPORT coords (overlay root is fixed).
-->
<template>
  <div
    ref="rootEl"
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

      <div class="space-y-2.5 p-3">
        <!-- Stale anchor notice -->
        <div
          v-if="stale"
          class="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-50/70 px-2.5 py-2 text-[11px] text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
        >
          <Icon name="alert-triangle" :size="12" :stroke-width="2" class="mt-px shrink-0" />
          <span>Original element not found on this page. The pin is shown at its last known spot — re-anchor it to fix.</span>
        </div>

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

        <!-- Status — shadcn Select, portalled into the themed shadow container. -->
        <div class="space-y-1 pt-1">
          <label class="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Status</label>
          <Select :model-value="status" :disabled="updating" @update:model-value="onStatusChange">
            <SelectTrigger class="h-8 w-full text-[12.5px]">
              <span class="flex items-center gap-2 truncate">
                <span :class="['h-1.5 w-1.5 shrink-0 rounded-full', statusDot]" />
                <SelectValue />
              </span>
            </SelectTrigger>
            <SelectContent :to="portalTarget ?? undefined">
              <SelectItem v-for="opt in STATUS_OPTS" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <footer class="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
        <Button
          v-if="stale"
          variant="outline"
          size="sm"
          class="gap-1.5"
          @click="emit('reanchor')"
        >
          <Icon name="crosshair" :size="11" :stroke-width="2" />
          Re-anchor
        </Button>
        <span v-else />

        <div class="flex items-center gap-2">
          <Button variant="ghost" size="sm" @click="emit('close')">Close</Button>
          <Button variant="default" size="sm" class="gap-1.5" @click="emit('open')">
            <Icon name="external-link" :size="11" :stroke-width="2" />
            View
          </Button>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  Button,
  Icon,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@deveprobe/ui';
import type { Severity, IssueStatus } from '@deveprobe/shared';

const props = defineProps<{
  index:     number;
  pageX:     number;
  pageY:     number;
  title:     string;
  summary:   string | null;
  severity:  Severity | null;
  issueType: string | null;
  status:    IssueStatus;
  /** True while the parent's PATCH is in flight. */
  updating?: boolean;
  /** True when the anchored element couldn't be re-resolved on this page. */
  stale?:    boolean;
}>();

const emit = defineEmits<{
  close:           [];
  open:            [];
  reanchor:        [];
  'change-status': [status: IssueStatus];
}>();

const STATUS_OPTS: { value: IssueStatus; label: string }[] = [
  { value: 'open',                  label: 'Open' },
  { value: 'triaged',               label: 'Triaged' },
  { value: 'in_progress',           label: 'In progress' },
  { value: 'awaiting_verification', label: 'Awaiting verification' },
  { value: 'resolved',              label: 'Resolved' },
  { value: 'verified',              label: 'Verified' },
  { value: 'reopened',              label: 'Reopened' },
  { value: 'archived',              label: 'Archived' },
];

function onStatusChange(next: unknown) {
  if (typeof next === 'string' && next !== props.status) {
    emit('change-status', next as IssueStatus);
  }
}

// ── Select portal target ────────────────────────────────────────────────────
// Portal the dropdown into the popover's OWN root (not the themed ancestor):
//   • stays inside the popover's stacking context (z-[2147483646]) so the
//     dropdown renders ON TOP of the popover instead of behind it
//   • theme CSS vars still cascade because the popover sits inside the themed
//     (.dark/.light) container
const rootEl = ref<HTMLElement | null>(null);
const portalTarget = computed<HTMLElement | null>(() => rootEl.value);

// ── Positioning ─────────────────────────────────────────────────────────────
const POPOVER_HEIGHT_ESTIMATE = 240;
const popoverStyle = computed<Record<string, string>>(() => {
  const viewportBottom = window.innerHeight;
  const wouldOverflow = props.pageY + 24 + POPOVER_HEIGHT_ESTIMATE > viewportBottom;
  if (wouldOverflow) {
    return { left: `${props.pageX}px`, top: `${props.pageY - 24}px`, transform: 'translate(-50%, -100%)' };
  }
  return { left: `${props.pageX}px`, top: `${props.pageY + 24}px`, transform: 'translateX(-50%)' };
});

// ── Visual maps ─────────────────────────────────────────────────────────────
const severityClass = computed(() => {
  switch (props.severity) {
    case 'critical': return 'bg-rose-500/15 text-rose-600 dark:text-rose-300';
    case 'high':     return 'bg-orange-500/15 text-orange-600 dark:text-orange-300';
    case 'medium':   return 'bg-amber-500/15 text-amber-600 dark:text-amber-300';
    case 'low':      return 'bg-neutral-500/15 text-muted-foreground';
    default:         return 'bg-muted text-muted-foreground';
  }
});

const STATUS_DOT: Record<string, string> = {
  open: 'bg-violet-500', triaged: 'bg-sky-500', in_progress: 'bg-amber-500',
  awaiting_verification: 'bg-blue-500', resolved: 'bg-emerald-500',
  verified: 'bg-emerald-600', reopened: 'bg-rose-500', archived: 'bg-neutral-400',
  draft: 'bg-neutral-400',
};
const statusDot = computed(() => STATUS_DOT[props.status] ?? 'bg-neutral-400');

function formatType(raw: string): string {
  return raw.replace(/_/g, ' ');
}
</script>
