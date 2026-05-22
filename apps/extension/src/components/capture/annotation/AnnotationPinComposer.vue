<!--
  AnnotationPinComposer
  ─────────────────────
  Inline popover anchored next to a freshly-dropped pin.

  Fields (v1):
    • Comment    (required, textarea, auto-focused)
    • Severity   (low / medium / high / critical, default medium)
    • Issue type (visual_bug / layout_issue / copy_issue / broken_behavior /
                  missing_element / accessibility / performance / other)

  Parked for v2 (deliberately not in this composer to keep submission fast):
    • Assignee   — needs the workspace members query
    • Labels     — needs an inline chip input
    • Screenshot markup — separate tool
    • Short clip — separate flow

  Submit emits a PinDraft to the parent; the parent handles the API call
  (create-issue + upload-screenshot crop) and unmounts the composer when the
  pin transitions to "submitted".

  Positioning: parent passes pageX/pageY (document coords). We render the
  popover ~24px below the pin, but flip above when there isn't room (last
  16px of viewport).
-->
<template>
  <div
    ref="rootEl"
    class="pointer-events-auto absolute z-[2147483646] w-[300px] -translate-x-1/2 select-text"
    :style="popoverStyle"
    @click.stop
    @keydown.stop
  >
    <div class="rounded-xl border border-border bg-card shadow-[0_16px_40px_rgba(0,0,0,0.16),0_2px_8px_rgba(0,0,0,0.08)] overflow-hidden">
      <!-- Header strip -->
      <header class="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <span class="flex items-center gap-1.5 text-[11px] font-semibold text-foreground/85">
          <Icon name="map-pin" :size="12" :stroke-width="2" class="text-amber-500" />
          Pin #{{ index }}
        </span>
        <button
          type="button"
          class="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Cancel pin"
          @click="emit('cancel')"
        >
          <Icon name="x" :size="12" :stroke-width="2" />
        </button>
      </header>

      <!-- Body -->
      <div class="space-y-3 p-3">
        <textarea
          ref="commentEl"
          v-model="comment"
          rows="3"
          maxlength="2000"
          placeholder="What's wrong here?"
          class="block w-full resize-none rounded-md border border-border bg-background px-2.5 py-2 text-[13px] leading-snug placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
          @keydown.meta.enter.prevent="onSubmit"
          @keydown.ctrl.enter.prevent="onSubmit"
        />

        <!-- Severity row -->
        <div class="flex flex-wrap items-center gap-1">
          <span class="mr-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Severity</span>
          <button
            v-for="s in SEVERITIES"
            :key="s.value"
            type="button"
            :class="[
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors',
              severity === s.value
                ? 'border-foreground bg-foreground text-background'
                : 'border-border bg-background text-foreground/80 hover:bg-muted',
            ]"
            @click="severity = s.value"
          >
            <span :class="['h-1.5 w-1.5 rounded-full', s.dot]" aria-hidden="true" />
            {{ s.label }}
          </button>
        </div>

        <!-- Issue type select -->
        <div class="space-y-1">
          <label class="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Type</label>
          <div class="relative">
            <select
              v-model="issueType"
              class="block w-full appearance-none rounded-md border border-border bg-background px-2.5 py-1.5 pr-8 text-[12.5px] focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option v-for="t in ISSUE_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
            </select>
            <Icon
              name="chevron-down"
              :size="12"
              :stroke-width="2"
              class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
          </div>
        </div>

        <!-- Error -->
        <div
          v-if="error"
          class="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-[11px] text-destructive"
        >
          <Icon name="alert-circle" :size="11" :stroke-width="2" class="mt-px shrink-0" />
          {{ error }}
        </div>
      </div>

      <!-- Footer -->
      <footer class="flex items-center justify-end gap-2 border-t border-border px-3 py-2">
        <Button variant="ghost" size="sm" :disabled="submitting" @click="emit('cancel')">
          Cancel
        </Button>
        <Button
          variant="default"
          size="sm"
          class="gap-1.5"
          :loading="submitting"
          :disabled="!canSubmit"
          @click="onSubmit"
        >
          <Icon v-if="!submitting" name="check" :size="12" :stroke-width="2.5" />
          {{ submitting ? 'Submitting…' : 'Submit pin' }}
        </Button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { Button, Icon } from '@deveprobe/ui';
import type { Severity } from '@deveprobe/shared';

/** Issue type values mirror the `annotation_issue_type` DB enum exactly. */
export type AnnotationIssueType =
  | 'visual_bug'
  | 'layout_issue'
  | 'copy_issue'
  | 'broken_behavior'
  | 'missing_element'
  | 'accessibility'
  | 'performance'
  | 'other';

export interface PinDraft {
  comment:   string;
  severity:  Severity;
  issueType: AnnotationIssueType;
}

const props = defineProps<{
  index:      number;
  /** Document-relative coordinates of the pin marker. */
  pageX:      number;
  pageY:      number;
  /** Set by parent while the API call is in flight. */
  submitting: boolean;
  /** Optional error string surfaced from the parent's API call. */
  error?:     string;
}>();

const emit = defineEmits<{
  submit: [draft: PinDraft];
  cancel: [];
}>();

// ── Form state ──────────────────────────────────────────────────────────────
const comment   = ref('');
const severity  = ref<Severity>('medium');
const issueType = ref<AnnotationIssueType>('visual_bug');

const canSubmit = computed(() => comment.value.trim().length > 0 && !props.submitting);

const SEVERITIES: { value: Severity; label: string; dot: string }[] = [
  { value: 'low',      label: 'Low',      dot: 'bg-neutral-400' },
  { value: 'medium',   label: 'Medium',   dot: 'bg-amber-400'   },
  { value: 'high',     label: 'High',     dot: 'bg-orange-500'  },
  { value: 'critical', label: 'Critical', dot: 'bg-rose-500'    },
];

const ISSUE_TYPES: { value: AnnotationIssueType; label: string }[] = [
  { value: 'visual_bug',      label: 'Visual bug' },
  { value: 'layout_issue',    label: 'Layout issue' },
  { value: 'copy_issue',      label: 'Copy issue' },
  { value: 'broken_behavior', label: 'Broken behavior' },
  { value: 'missing_element', label: 'Missing element' },
  { value: 'accessibility',   label: 'Accessibility' },
  { value: 'performance',     label: 'Performance' },
  { value: 'other',           label: 'Other' },
];

// ── Positioning ─────────────────────────────────────────────────────────────
// Default position: ~24px below the pin centre. Flip above when the popover
// would otherwise hang past the visible viewport bottom.
const rootEl = ref<HTMLDivElement | null>(null);

const popoverStyle = computed<Record<string, string>>(() => {
  const POPOVER_HEIGHT_ESTIMATE = 280; // good enough for the flip decision
  const viewportBottom = window.scrollY + window.innerHeight;
  const wouldOverflow = props.pageY + 24 + POPOVER_HEIGHT_ESTIMATE > viewportBottom;
  if (wouldOverflow) {
    // Flip above the pin.
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

// ── Focus + submit ──────────────────────────────────────────────────────────
const commentEl = ref<HTMLTextAreaElement | null>(null);

onMounted(async () => {
  await nextTick();
  commentEl.value?.focus();
});

function onSubmit() {
  if (!canSubmit.value) return;
  emit('submit', {
    comment:   comment.value.trim(),
    severity:  severity.value,
    issueType: issueType.value,
  });
}
</script>
