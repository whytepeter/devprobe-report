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
        <!-- Mini markdown editor: toolbar + textarea + image chips. -->
        <div class="relative rounded-md border border-border bg-background focus-within:ring-1 focus-within:ring-ring">
          <!-- Toolbar -->
          <div class="flex items-center gap-0.5 border-b border-border px-1.5 py-1">
            <button type="button" class="dp-md-btn" title="Bold (⌘B)" @click="wrapSelection('**', '**')">
              <Icon name="bold" :size="13" :stroke-width="2.25" />
            </button>
            <button type="button" class="dp-md-btn" title="Italic" @click="wrapSelection('_', '_')">
              <Icon name="italic" :size="13" :stroke-width="2" />
            </button>
            <button type="button" class="dp-md-btn" :class="linkOpen && 'bg-muted text-foreground'" title="Insert link" @click="openLinkPopover">
              <Icon name="link" :size="13" :stroke-width="2" />
            </button>
            <button type="button" class="dp-md-btn" title="Attach image" @click="imageInput?.click()">
              <Icon name="image" :size="13" :stroke-width="2" />
            </button>
            <span class="ml-auto pr-1 text-[9px] uppercase tracking-wide text-muted-foreground/60">Markdown</span>
          </div>

          <!-- Link popover (replaces native window.prompt) -->
          <div
            v-if="linkOpen"
            class="absolute left-2 right-2 top-9 z-20 rounded-lg border border-border bg-popover p-2 shadow-[0_12px_32px_rgba(0,0,0,0.18)]"
          >
            <div class="space-y-1.5">
              <input
                v-model="linkText"
                type="text"
                placeholder="Text"
                class="block w-full rounded-md border border-border bg-background px-2 py-1 text-[12px] focus:outline-none focus:ring-1 focus:ring-ring"
                @keydown.enter.prevent="confirmLink"
                @keydown.escape.stop="cancelLink"
              />
              <input
                ref="linkUrlEl"
                v-model="linkUrl"
                type="url"
                placeholder="https://…"
                class="block w-full rounded-md border border-border bg-background px-2 py-1 text-[12px] focus:outline-none focus:ring-1 focus:ring-ring"
                @keydown.enter.prevent="confirmLink"
                @keydown.escape.stop="cancelLink"
              />
            </div>
            <div class="mt-2 flex items-center justify-end gap-1.5">
              <Button variant="ghost" size="xs" @click="cancelLink">Cancel</Button>
              <Button variant="default" size="xs" :disabled="!linkUrl.trim()" @click="confirmLink">Add link</Button>
            </div>
          </div>

          <textarea
            ref="commentEl"
            v-model="comment"
            rows="3"
            maxlength="2000"
            placeholder="What's wrong here? **Markdown** supported."
            class="block w-full resize-none border-0 bg-transparent px-2.5 py-2 text-[13px] leading-snug placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0"
            @keydown.meta.enter.prevent="onSubmit"
            @keydown.ctrl.enter.prevent="onSubmit"
            @keydown.meta.b.prevent="wrapSelection('**', '**')"
          />

          <!-- Attached-image chips -->
          <div v-if="images.length" class="flex flex-wrap gap-1.5 border-t border-border px-2 py-1.5">
            <span
              v-for="(img, i) in images"
              :key="i"
              class="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-foreground/80"
            >
              <Icon name="image" :size="10" :stroke-width="2" class="text-muted-foreground" />
              <span class="max-w-[120px] truncate">{{ img.name }}</span>
              <button type="button" class="text-muted-foreground hover:text-foreground" @click="removeImage(i)">
                <Icon name="x" :size="9" :stroke-width="2.5" />
              </button>
            </span>
          </div>
        </div>

        <!-- Hidden file input for image attach -->
        <input
          ref="imageInput"
          type="file"
          accept="image/*"
          multiple
          class="hidden"
          @change="onImagesPicked"
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
          <Select :model-value="issueType" @update:model-value="onTypeChange">
            <SelectTrigger class="h-8 w-full text-[12.5px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent :to="portalTarget ?? undefined">
              <SelectItem v-for="t in ISSUE_TYPES" :key="t.value" :value="t.value">{{ t.label }}</SelectItem>
            </SelectContent>
          </Select>
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
import {
  Button,
  Icon,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@deveprobe/ui';
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
  /** Images attached in the composer — uploaded to the issue on submit. */
  images:    File[];
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
const images    = ref<File[]>([]);

const canSubmit = computed(
  () => (comment.value.trim().length > 0 || images.value.length > 0) && !props.submitting,
);

// ── Markdown editor helpers ──────────────────────────────────────────────────
const imageInput = ref<HTMLInputElement | null>(null);

// Portal target for the type Select — the composer's own root (declared below
// for positioning), so the dropdown shares its stacking context (renders on
// top) and inherits theme vars.
const portalTarget = computed<HTMLElement | null>(() => rootEl.value);

/** Wrap the current textarea selection with before/after markers (or insert). */
function wrapSelection(before: string, after: string) {
  const el = commentEl.value;
  if (!el) return;
  const start = el.selectionStart ?? comment.value.length;
  const end   = el.selectionEnd   ?? comment.value.length;
  const sel   = comment.value.slice(start, end) || 'text';
  comment.value = comment.value.slice(0, start) + before + sel + after + comment.value.slice(end);
  // Restore selection around the wrapped text.
  void nextTick(() => {
    el.focus();
    el.selectionStart = start + before.length;
    el.selectionEnd   = start + before.length + sel.length;
  });
}

function onTypeChange(v: unknown) {
  if (typeof v === 'string') issueType.value = v as AnnotationIssueType;
}

// ── Link popover (replaces window.prompt) ────────────────────────────────────
const linkOpen   = ref(false);
const linkText   = ref('');
const linkUrl    = ref('');
const linkUrlEl  = ref<HTMLInputElement | null>(null);
let   linkSel    = { start: 0, end: 0 };

function openLinkPopover() {
  const el = commentEl.value;
  linkSel = {
    start: el?.selectionStart ?? comment.value.length,
    end:   el?.selectionEnd   ?? comment.value.length,
  };
  linkText.value = comment.value.slice(linkSel.start, linkSel.end);
  linkUrl.value  = '';
  linkOpen.value = true;
  void nextTick(() => linkUrlEl.value?.focus());
}
function confirmLink() {
  const url = linkUrl.value.trim();
  if (!url) { linkOpen.value = false; return; }
  const label = (linkText.value.trim() || 'link');
  comment.value =
    comment.value.slice(0, linkSel.start) + `[${label}](${url})` + comment.value.slice(linkSel.end);
  linkOpen.value = false;
  void nextTick(() => commentEl.value?.focus());
}
function cancelLink() { linkOpen.value = false; }

function onImagesPicked(e: Event) {
  const files = (e.target as HTMLInputElement).files;
  if (!files) return;
  for (const f of Array.from(files)) {
    if (f.type.startsWith('image/')) images.value.push(f);
  }
  // Reset so the same file can be re-picked after removal.
  (e.target as HTMLInputElement).value = '';
}
function removeImage(i: number) {
  images.value.splice(i, 1);
}

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
  // pageX/pageY are VIEWPORT coords (overlay root is fixed), so compare
  // against the viewport height directly.
  const viewportBottom = window.innerHeight;
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
    images:    images.value.slice(),
  });
}
</script>

<style scoped>
/* Markdown toolbar buttons — small icon buttons. Defined locally because the
   shadow root doesn't inherit the page stylesheet. */
.dp-md-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 1.5rem;
  width: 1.5rem;
  border-radius: 0.375rem;
  color: hsl(var(--muted-foreground));
  transition: background-color 0.12s, color 0.12s;
}
.dp-md-btn:hover {
  background: hsl(var(--muted));
  color: hsl(var(--foreground));
}
</style>
