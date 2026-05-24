<!--
  AnnotationPin
  ─────────────
  Small numbered marker dropped at the click point. Stays on the page while
  the user works on another pin, and outlives the composer.

  Colour rules (per the reviewer-workflow requirement):
    • DRAFT (composer open, not yet submitted) → severity tint, so the
      author sees gravity while writing.
    • SUBMITTED / EXISTING                      → STATUS colour, so anyone
      viewing the page can read triage state at a glance (open vs in-progress
      vs resolved …). Status is the dominant signal once a pin is real.

  Positioned ABSOLUTELY in document coordinates so the pin scrolls with the
  page naturally. The parent (AnnotationOverlay) computes pageX/pageY from
  the click event + the captured scroll position.
-->
<template>
  <button
    type="button"
    :class="[
      'pointer-events-auto absolute z-[2147483645] -translate-x-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold text-white shadow-[0_2px_8px_rgba(0,0,0,0.25)] ring-2 transition-transform hover:scale-110',
      pinBg,
      stale
        ? 'ring-amber-400 opacity-75 outline outline-2 outline-dashed outline-amber-400 outline-offset-1'
        : 'ring-white',
    ]"
    :style="{ left: pageX + 'px', top: pageY + 'px' }"
    :aria-label="stale ? `Pin ${index} (element not found)` : `Open pin ${index}`"
    @click.stop="$emit('open')"
  >
    {{ index }}
    <!-- Stale badge: a tiny warning dot so unresolved pins stand out in a sea
         of resolved ones. -->
    <span
      v-if="stale"
      class="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-amber-400 ring-1 ring-white"
    >
      <span class="h-1 w-1 rounded-full bg-amber-900" />
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Severity, IssueStatus } from '@deveprobe/shared';

const props = defineProps<{
  index:    number;
  pageX:    number;
  pageY:    number;
  severity: Severity;
  /** "draft" = composer still open; "submitted" = issue persisted. */
  state:    'draft' | 'submitted';
  /** Issue status — drives colour for submitted pins. Optional for drafts. */
  status?:  IssueStatus;
  /** True when the anchored element couldn't be re-resolved on this page. */
  stale?:   boolean;
}>();

defineEmits<{ open: [] }>();

// Draft tint: severity. (Author hasn't picked a status yet.)
const SEVERITY_BG: Record<Severity, string> = {
  low:      'bg-neutral-500',
  medium:   'bg-amber-500',
  high:     'bg-orange-500',
  critical: 'bg-rose-500',
};

// Submitted tint: status. Mirrors the web StatusChip palette so the colour
// language is consistent between the overlay and the dashboard.
const STATUS_BG: Record<string, string> = {
  open:                  'bg-violet-500',
  draft:                 'bg-neutral-400',
  triaged:               'bg-sky-500',
  in_progress:           'bg-amber-500',
  awaiting_verification: 'bg-blue-500',
  resolved:              'bg-emerald-500',
  verified:              'bg-emerald-600',
  reopened:              'bg-rose-500',
  archived:              'bg-neutral-400',
};

const pinBg = computed(() => {
  if (props.state === 'draft') return SEVERITY_BG[props.severity];
  return STATUS_BG[props.status ?? 'open'] ?? 'bg-violet-500';
});
</script>
