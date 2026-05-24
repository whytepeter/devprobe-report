<!--
  PinView
  ───────
  Hero area for `mode === 'live_annotation'` issues — the GROUPED model: one
  issue holds many pins.

  Layout:
    1. Cover screenshot with numbered pin markers overlaid at their original
       positions (computed from the anchor rect + offset % stored on each pin).
    2. "Pinned on <page>" banner.
    3. The pin list (IssuePinList) — clicking a cover marker scrolls to / highlights
       the matching list row.

  Page URL line, title, description, metadata, activity → IssuePage shell.
-->
<template>
  <div class="space-y-4">
    <!-- Cover screenshot with pin overlays -->
    <figure
      v-if="coverImageId"
      class="relative overflow-hidden rounded-2xl border border-border bg-muted/30"
    >
      <IssueMediaImage
        :attachment-id="coverImageId"
        :alt="issue.title"
        class="block w-full"
      />

      <!-- Pin markers: positioned as % of original viewport dims -->
      <template v-if="!loading">
        <button
          v-for="pin in pinsWithPos"
          :key="pin.id"
          type="button"
          class="absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-[11px] font-bold text-white shadow-[0_2px_8px_rgba(0,0,0,0.25)] ring-2 ring-white/40 transition-transform hover:scale-125 focus:outline-none"
          :class="[statusBg(pin.status), activePinId === pin.id && 'scale-125 ring-white/80']"
          :style="{ left: pin.left, top: pin.top }"
          :title="`Pin #${pin.index}${pin.comment ? ': ' + pin.comment.slice(0, 80) : ''}`"
          @click="activePinId = activePinId === pin.id ? null : pin.id"
        >
          {{ pin.index }}
        </button>
      </template>
    </figure>

    <!-- Pinned-on banner -->
    <aside
      class="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-50/70 px-5 py-3 dark:bg-amber-500/10"
    >
      <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-300">
        <Icon name="map-pin" :size="14" :stroke-width="2" />
      </span>
      <p class="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-700 dark:text-amber-300">
        Pinned on
        <span class="font-mono normal-case tracking-normal text-foreground/80">{{ displayUrl }}</span>
      </p>
    </aside>

    <!-- Pins list -->
    <IssuePinList
      :pins="pins"
      :loading="loading"
      :active-pin-id="activePinId"
      @update:active-pin-id="activePinId = $event"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRef } from "vue";
import { Icon } from "@deveprobe/ui";
import IssueMediaImage from "@/features/issues/components/IssueMediaImage.vue";
import IssuePinList from "@/features/issues/components/IssuePinList.vue";
import { useIssuePins } from "@/features/issues/composables/useIssuePins.js";
import type { Issue, Attachment } from "@deveprobe/shared";
import type { IssuePin } from "@/features/issues/composables/useIssuePins.js";

const props = defineProps<{
  issue:       Issue;
  attachments: Attachment[];
}>();

const activePinId = ref<string | null>(null);

const displayUrl = computed(() => {
  if (!props.issue.pageUrl) return "the page";
  try {
    const u = new URL(props.issue.pageUrl);
    return u.host + (u.pathname === "/" ? "" : u.pathname);
  } catch {
    return props.issue.pageUrl;
  }
});

// Cover = the first-pin screenshot uploaded on submit (type screenshot/thumbnail).
const coverImageId = computed<string | null>(() => {
  const screenshot = props.attachments.find((a) => a.type === "screenshot");
  if (screenshot) return screenshot.id;
  const thumbnail = props.attachments.find((a) => a.type === "thumbnail");
  return thumbnail?.id ?? null;
});

// Grouped pins for this issue.
const { pins, loading } = useIssuePins(toRef(() => props.issue.id));

// ── Pin overlay positioning ────────────────────────────────────────────────────
// Each pin's anchor includes the element bounding rect (viewport-relative at
// capture time) + the click offset within that rect as 0..1 percentages, plus
// the viewport size at capture. We express the click point as a percentage of
// the original viewport, which maps directly to a `left`/`top` % on the cover
// image (which is a full-viewport screenshot).
interface PinAnchorMeta {
  rect:     { x: number; y: number; w: number; h: number };
  offset:   { xPct: number; yPct: number };
  viewport: { width: number; height: number };
}

function pinCoverPos(anchor: Record<string, unknown>): { left: string; top: string } | null {
  const a = anchor as unknown as PinAnchorMeta;
  if (!a?.rect || !a?.offset || !a?.viewport?.width || !a?.viewport?.height) return null;
  const clickX = a.rect.x + a.offset.xPct * a.rect.w;
  const clickY = a.rect.y + a.offset.yPct * a.rect.h;
  const left   = (clickX / a.viewport.width)  * 100;
  const top    = (clickY / a.viewport.height) * 100;
  if (!isFinite(left) || !isFinite(top) || left < 0 || top < 0 || left > 100 || top > 100) return null;
  return { left: `${left.toFixed(3)}%`, top: `${top.toFixed(3)}%` };
}

interface PinWithPos extends IssuePin {
  left: string;
  top:  string;
}

const pinsWithPos = computed<PinWithPos[]>(() =>
  pins.value.flatMap((pin) => {
    const pos = pinCoverPos(pin.anchor);
    if (!pos) return [];
    return [{ ...pin, ...pos }];
  }),
);

// ── Status colour map ──────────────────────────────────────────────────────────
const STATUS_BG: Record<string, string> = {
  open:                   "bg-violet-500",
  triaged:                "bg-sky-500",
  in_progress:            "bg-amber-500",
  awaiting_verification:  "bg-blue-500",
  resolved:               "bg-emerald-500",
  verified:               "bg-emerald-600",
  reopened:               "bg-rose-500",
  archived:               "bg-neutral-400",
  draft:                  "bg-neutral-400",
};
function statusBg(s: string) { return STATUS_BG[s] ?? "bg-violet-500"; }
</script>
