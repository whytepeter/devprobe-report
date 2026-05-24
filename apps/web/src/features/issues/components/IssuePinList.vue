<!--
  IssuePinList
  ────────────
  Renders the pins grouped under a live-annotation issue: numbered marker
  (coloured by status), the pin comment (with safe inline-markdown links),
  severity / type / status chips, and labels.

  `activePinId` (from PinView's cover-overlay click) highlights + scrolls to
  the matching row. Emits `update:activePinId` back so the parent can clear it
  when the user clicks elsewhere.
-->
<template>
  <section class="space-y-3">
    <div class="flex items-center justify-between">
      <h2 class="text-[13px] font-semibold text-foreground">
        Pins <span class="text-muted-foreground">· {{ pins.length }}</span>
      </h2>
    </div>

    <div v-if="loading" class="space-y-2">
      <div v-for="i in 3" :key="i" class="h-16 animate-pulse rounded-xl border border-border bg-muted/40" />
    </div>

    <p v-else-if="pins.length === 0" class="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
      No pins on this annotation.
    </p>

    <ul v-else class="space-y-2">
      <li
        v-for="pin in pins"
        :key="pin.id"
        :ref="(el) => setRowRef(pin.id, el)"
        class="flex items-start gap-3 rounded-xl border px-4 py-3 transition-colors"
        :class="[
          activePinId === pin.id
            ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20'
            : 'border-border bg-card/40',
        ]"
        @click="$emit('update:activePinId', activePinId === pin.id ? null : pin.id)"
      >
        <span
          class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
          :class="statusBg(pin.status)"
        >
          {{ pin.index }}
        </span>

        <div class="min-w-0 flex-1 space-y-1.5">
          <!-- Comment (safe inline-markdown: links / bold / italic / code) -->
          <p
            class="text-sm leading-relaxed text-foreground/90 [overflow-wrap:anywhere]"
            v-html="renderInlineMarkdown(pin.comment)"
          />

          <!-- Status / severity / type chips -->
          <div class="flex flex-wrap items-center gap-1.5 text-[10px]">
            <span :class="['inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium', statusChip(pin.status)]">
              <span :class="['h-1.5 w-1.5 rounded-full', statusDot(pin.status)]" />
              {{ formatLabel(pin.status) }}
            </span>
            <span class="inline-flex items-center rounded bg-muted px-1.5 py-0.5 font-medium capitalize text-muted-foreground">
              {{ pin.severity }}
            </span>
            <span class="inline-flex items-center rounded bg-muted px-1.5 py-0.5 font-mono uppercase tracking-wide text-muted-foreground">
              {{ formatLabel(pin.issueType) }}
            </span>
          </div>

          <!-- Labels -->
          <div v-if="pin.labels?.length" class="flex flex-wrap items-center gap-1">
            <span
              v-for="label in pin.labels"
              :key="label"
              class="inline-flex items-center rounded bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-600 dark:text-violet-400"
            >
              {{ label }}
            </span>
          </div>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { watch } from "vue";
import { renderInlineMarkdown } from "@/features/issues/lib/inline-markdown.js";
import type { IssuePin } from "@/features/issues/composables/useIssuePins.js";

const props = defineProps<{
  pins:        IssuePin[];
  loading:     boolean;
  activePinId?: string | null;
}>();

const emit = defineEmits<{
  "update:activePinId": [id: string | null];
}>();

// ── Row refs for scroll-into-view ────────────────────────────────────────────
const rowRefs = new Map<string, Element>();

function setRowRef(id: string, el: unknown) {
  if (el instanceof Element) rowRefs.set(id, el);
  else rowRefs.delete(id);
}

watch(() => props.activePinId, (id) => {
  if (!id) return;
  const el = rowRefs.get(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

// ── Status colour maps ────────────────────────────────────────────────────────
const STATUS_BG: Record<string, string> = {
  open:                  "bg-violet-500",
  triaged:               "bg-sky-500",
  in_progress:           "bg-amber-500",
  awaiting_verification: "bg-blue-500",
  resolved:              "bg-emerald-500",
  verified:              "bg-emerald-600",
  reopened:              "bg-rose-500",
  archived:              "bg-neutral-400",
  draft:                 "bg-neutral-400",
};
const STATUS_CHIP: Record<string, string> = {
  open:        "bg-violet-500/15 text-violet-600 dark:text-violet-300",
  in_progress: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  resolved:    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  reopened:    "bg-rose-500/15 text-rose-600 dark:text-rose-300",
};

function statusBg(s: string)   { return STATUS_BG[s]   ?? "bg-violet-500"; }
function statusDot(s: string)  { return STATUS_BG[s]   ?? "bg-violet-500"; }
function statusChip(s: string) { return STATUS_CHIP[s] ?? "bg-muted text-muted-foreground"; }
function formatLabel(s: string) { return s.replace(/_/g, " "); }
</script>
