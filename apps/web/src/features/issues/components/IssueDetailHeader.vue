<!--
  IssueDetailHeader
  ─────────────────
  Top nav bar for /issue/:id. Three regions:

    LEFT
      • Back chevron
      • Breadcrumb — "<workspace> / Issues"
      • Identity chip — [mode icon · DP-127 │ status │ severity]  (segmented)
      • Auto-watching pill (+ AUTO · watching)

    RIGHT
      • MCP live status pill (when an MCP session is attached)
      • Send to inbox (⌘E) — kept as a UI scaffold; mutation pending
      • Share (link icon)
      • Overflow menu

  Single-line, no wrap. The identity chip is the only "interesting" piece —
  it's a segmented control made of three sub-pills sharing a single rounded
  container so status/severity read as attributes of the issue rather than
  free-floating chips.
-->
<template>
  <header class="h-12 flex items-center gap-3 px-5 border-b border-border flex-shrink-0 bg-background">
    <!-- Back -->
    <Button variant="ghost" size="icon-sm" class="-ml-2 shrink-0" as-child>
      <RouterLink to="/issues" aria-label="Back to issues">
        <Icon name="chevron-left" :size="16" :stroke-width="1.75" />
      </RouterLink>
    </Button>

    <!-- Breadcrumb -->
    <nav class="flex items-center gap-1.5 text-[13px] min-w-0">
      <span class="truncate text-muted-foreground">{{ workspaceName }}</span>
      <span class="text-muted-foreground/50">/</span>
      <RouterLink
        to="/issues"
        class="font-semibold text-foreground hover:underline underline-offset-2"
      >
        Issues
      </RouterLink>
    </nav>

    <!-- Identity chip — mode + id │ status │ severity
         First segment is mode-tinted (sky/violet/amber); the status + severity
         segments stay neutral so the chip reads as "[mode] [meta] [meta]". -->
    <div
      v-if="issue"
      class="ml-2 flex items-center divide-x divide-border rounded-md border border-border bg-card overflow-hidden text-[12px]"
    >
      <span :class="['flex items-center gap-1.5 px-2.5 py-1', modeChipBg]">
        <Icon :name="modeIcon" :size="12" :stroke-width="2" :class="modeIconColor" />
        <span class="font-mono font-medium" :class="modeIconColor">{{ shortId }}</span>
      </span>
      <span class="flex items-center gap-1.5 px-2.5 py-1 text-foreground/85">
        <span :class="['h-1.5 w-1.5 rounded-full', statusDot]" aria-hidden="true" />
        {{ statusLabel }}
      </span>
      <span v-if="issue.severity" class="flex items-center gap-1.5 px-2.5 py-1 text-foreground/85">
        <span :class="['h-1.5 w-1.5 rounded-full', severityDot]" aria-hidden="true" />
        {{ severityLabel }}
      </span>
    </div>

    <!-- Auto-watching pill — recordings only.
         The "AUTO watching" affordance exists because recordings are long
         multi-part captures where keeping the reporter / assignee notified
         of new comments is the default. Pins + screenshots don't get it. -->
    <button
      v-if="issue && issue.mode === 'screen_recording'"
      type="button"
      class="ml-1 inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-50/70 px-2 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 transition-colors hover:bg-emerald-100/70 dark:hover:bg-emerald-500/15"
    >
      <Icon name="plus" :size="10" :stroke-width="2.5" />
      <span class="font-mono uppercase tracking-wide">AUTO</span>
      <span class="text-emerald-700/60 dark:text-emerald-300/60">|</span>
      watching
    </button>

    <!-- Right cluster -->
    <div class="ml-auto flex items-center gap-1.5">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-md border border-violet-500/30 bg-violet-50/70 px-2 py-1 text-[11px] font-medium text-violet-700 dark:bg-violet-500/10 dark:text-violet-300 transition-colors hover:bg-violet-100/70 dark:hover:bg-violet-500/15"
      >
        <span class="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" aria-hidden="true" />
        <span class="font-mono uppercase tracking-wide">MCP</span>
        <span class="lowercase">live</span>
      </button>

      <Button variant="ghost" size="sm" class="gap-1.5 text-[12px]" @click="emit('send')">
        <Icon name="send" :size="13" :stroke-width="1.75" />
        Send
        <kbd class="rounded bg-muted px-1 py-0.5 text-[10px] font-mono text-muted-foreground">⌘E</kbd>
      </Button>

      <Button variant="ghost" size="sm" class="gap-1.5 text-[12px]" @click="emit('share')">
        <Icon name="link" :size="13" :stroke-width="1.75" />
        Share
      </Button>

      <Button variant="ghost" size="icon-sm" aria-label="More actions" @click="emit('menu')">
        <Icon name="more-horizontal" :size="14" :stroke-width="1.75" />
      </Button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { Button, Icon } from "@deveprobe/ui";
import { useAuthStore } from "@/features/auth/auth.store.js";
import type { Issue, IssueMode } from "@deveprobe/shared";

const props = defineProps<{
  /** Full issue id — used to derive the visible short id (DP-XXX style). */
  issueId: string;
  /** Issue payload — header still renders skeletons while this loads. */
  issue:   Issue | null;
}>();

const emit = defineEmits<{
  send:  [];
  share: [];
  menu:  [];
}>();

// ── Breadcrumb workspace name ──────────────────────────────────────────────
const authStore = useAuthStore();
const workspaceName = computed(() => authStore.currentWorkspace?.name ?? "Workspace");

// ── Identity chip ──────────────────────────────────────────────────────────
// Visible short id mimics the design's `DP-127`. We don't yet store an
// org-scoped sequence column on issues so for now we surface the first
// 6 hex chars of the uuid — same shape, no collisions in practice.
const shortId = computed(() => "DP-" + props.issueId.replace(/-/g, "").slice(0, 6).toUpperCase());

// Mode → icon + tint + chip-segment background. Inline (not via TypeChip)
// because we share a single bordered container with status + severity.
const MODE_ICON: Record<IssueMode, { icon: string; color: string; chipBg: string }> = {
  screenshot:       {
    icon:   "monitor",
    color:  "text-sky-700    dark:text-sky-300",
    chipBg: "bg-sky-100/70   dark:bg-sky-500/15",
  },
  screen_recording: {
    icon:   "video",
    color:  "text-violet-700 dark:text-violet-300",
    chipBg: "bg-violet-100/70 dark:bg-violet-500/15",
  },
  live_annotation:  {
    icon:   "map-pin",
    color:  "text-amber-700  dark:text-amber-300",
    chipBg: "bg-amber-100/70 dark:bg-amber-500/15",
  },
  imported:         {
    icon:   "file-input",
    color:  "text-neutral-700 dark:text-neutral-300",
    chipBg: "bg-neutral-100  dark:bg-neutral-700/40",
  },
};
const modeIcon      = computed(() => props.issue ? MODE_ICON[props.issue.mode].icon   : "circle");
const modeIconColor = computed(() => props.issue ? MODE_ICON[props.issue.mode].color  : "text-muted-foreground");
const modeChipBg    = computed(() => props.issue ? MODE_ICON[props.issue.mode].chipBg : "");

// Status pill colour (matches StatusChip palette).
const STATUS_DOT: Record<string, string> = {
  open:                  "bg-violet-500",
  draft:                 "bg-neutral-400",
  triaged:               "bg-sky-500",
  in_progress:           "bg-amber-500",
  awaiting_verification: "bg-blue-500",
  resolved:              "bg-emerald-500",
  verified:              "bg-emerald-600",
  reopened:              "bg-rose-500",
  archived:              "bg-neutral-400",
};
const statusDot   = computed(() => STATUS_DOT[props.issue?.status ?? ""] ?? "bg-neutral-400");
const statusLabel = computed(() =>
  (props.issue?.status ?? "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase()),
);

// Severity pill colour.
const SEVERITY_DOT: Record<string, string> = {
  critical: "bg-rose-500",
  high:     "bg-amber-500",
  medium:   "bg-teal-500",
  low:      "bg-neutral-400",
};
const severityDot   = computed(() => SEVERITY_DOT[props.issue?.severity ?? ""] ?? "bg-neutral-400");
const severityLabel = computed(() =>
  props.issue?.severity ? props.issue.severity[0]!.toUpperCase() + props.issue.severity.slice(1) : "",
);
</script>
