<!--
  AnnotationPin
  ─────────────
  Small numbered marker dropped at the click point. Stays on the page while
  the user works on another pin, and outlives the composer.

  Visual: violet ring + white inner + index number. Severity is mapped to a
  ring colour so a reviewer sees the gravity at a glance even before opening
  the pin.

  Positioned ABSOLUTELY in document coordinates so the pin scrolls with the
  page naturally. The parent (AnnotationOverlay) computes pageX/pageY from
  the click event + the captured scroll position so each pin is anchored
  correctly regardless of subsequent scroll.
-->
<template>
  <button
    type="button"
    :class="[
      'pointer-events-auto absolute z-[2147483645] -translate-x-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold text-white shadow-[0_2px_8px_rgba(0,0,0,0.25)] ring-2 ring-white transition-transform hover:scale-110',
      ringClass,
    ]"
    :style="{ left: pageX + 'px', top: pageY + 'px' }"
    :aria-label="`Open pin ${index}`"
    @click.stop="$emit('open')"
  >
    {{ index }}
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Severity } from '@deveprobe/shared';

const props = defineProps<{
  index:    number;
  pageX:    number;
  pageY:    number;
  severity: Severity;
  /** "draft" = composer still open; "submitted" = issue persisted. */
  state:    'draft' | 'submitted';
}>();

defineEmits<{ open: [] }>();

// Submitted pins switch to a green accent so the user can see what's done
// at a glance. Drafts keep severity tint.
const SEVERITY_BG: Record<Severity, string> = {
  low:      'bg-neutral-500',
  medium:   'bg-amber-500',
  high:     'bg-orange-500',
  critical: 'bg-rose-500',
};

const ringClass = computed(() =>
  props.state === 'submitted' ? 'bg-emerald-500' : SEVERITY_BG[props.severity],
);
</script>
