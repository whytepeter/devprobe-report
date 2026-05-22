<!--
  AnnotationToolbar
  ─────────────────
  Top floating pill the user sees while annotation is active. Two states:

    VIEW (default after opening annotation):
      [Annotate] [N pins]  [+ Pin] [Done]

      • Page is fully interactive. Pins are visible but clicking them just
        opens their detail popover — the user can still scroll, type, and
        click through to the underlying page.

    PLACE (entered by clicking "+ Pin"):
      [Annotate] [Picking…]  [Cancel]

      • Element-highlight + click-to-drop is active. Cancelling here returns
        to VIEW; the user has NOT exited annotation.

  Done exits annotation entirely. The pins are persisted server-side so
  re-opening annotation later on the same page brings them back.
-->
<template>
  <div
    class="fixed left-1/2 top-4 z-[2147483646] -translate-x-1/2 pointer-events-auto"
  >
    <div
      class="flex items-center gap-2 rounded-full bg-[#111]/85 backdrop-blur-md px-2.5 py-1.5 text-white shadow-[0_10px_40px_rgba(0,0,0,0.35),0_0_0_1px_rgba(255,255,255,0.08)]"
    >
      <!-- Brand pill -->
      <span class="flex items-center gap-1.5 px-1.5 text-[11px] font-semibold tracking-tight">
        <Icon name="map-pin" :size="12" :stroke-width="2" class="text-amber-400" />
        Annotate
      </span>

      <span class="h-3.5 w-px bg-white/15" aria-hidden="true" />

      <!-- Status -->
      <span class="px-1 text-[11px] text-white/70">
        <template v-if="mode === 'place'">
          <span class="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse mr-1" />
          Click anywhere to pin
        </template>
        <template v-else>
          {{ pinCount }} {{ pinCount === 1 ? 'pin' : 'pins' }}
        </template>
      </span>

      <span class="h-3.5 w-px bg-white/15" aria-hidden="true" />

      <!-- Action: VIEW → '+ Pin' enters PLACE; PLACE → 'Cancel' returns to VIEW. -->
      <button
        v-if="mode === 'view'"
        type="button"
        class="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 h-7 text-[11px] font-semibold text-black transition-colors hover:bg-amber-400"
        @click="$emit('start-place')"
      >
        <Icon name="plus" :size="11" :stroke-width="2.5" />
        Pin
      </button>
      <button
        v-else
        type="button"
        class="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 h-7 text-[11px] font-medium text-white/85 transition-colors hover:bg-white/15"
        @click="$emit('cancel-place')"
      >
        Cancel
      </button>

      <!-- Done — exits annotation entirely. -->
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 h-7 text-[11px] font-medium text-white/85 transition-colors hover:bg-white/15"
        @click="$emit('done')"
      >
        Done
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from "@deveprobe/ui";

defineProps<{
  mode:     'view' | 'place';
  pinCount: number;
}>();

defineEmits<{
  'start-place':  [];
  'cancel-place': [];
  done:           [];
}>();
</script>
