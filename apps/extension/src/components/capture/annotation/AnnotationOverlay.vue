<!--
  AnnotationOverlay
  ─────────────────
  Top-level orchestrator for the live-annotation flow, with two modes:

    VIEW (default):
      • Page is FULLY interactive — root has pointer-events:none.
      • Existing pins for this URL are fetched + rendered. Clicking a pin
        opens AnnotationPinDetail with the stored comment.
      • Toolbar at top: [+ Pin] enters PLACE mode; [Done] exits annotation.

    PLACE:
      • A click-capture layer covers the page. Cursor: crosshair.
      • Hover an element → outline highlight. Click → describe element,
        drop a draft pin, open AnnotationPinComposer.
      • Submit → POST /issues, pin turns emerald + persists.
      • Cancel / Esc → drop the draft pin, return to VIEW.

  Persistence: existing pins survive because each pin = one annotation
  issue in the org's issues table. Visiting the same URL again + entering
  annotation refetches them via /issues/pins.
-->
<template>
  <!-- Outer layer is INERT by default — pointer-events:none lets every page
       click pass through. We re-enable pointer-events on individual children
       (toolbar, pin markers, place-mode capture layer). -->
  <div class="fixed inset-0 z-[2147483640] pointer-events-none">
    <!-- PLACE-mode capture layer: covers the page only while picking AND no
         composer is currently open. Without the second guard, the layer's
         pointer-events:auto would steal clicks meant for the composer that
         floats above it. -->
    <div
      v-if="mode === 'place' && !composingPin"
      class="absolute inset-0 pointer-events-auto"
      style="cursor: crosshair"
      @click.stop="onPlaceClick"
      @mousemove.passive="onPlaceMove"
    >
      <!-- Hover outline -->
      <div
        v-if="hover"
        class="absolute pointer-events-none rounded-sm transition-[transform,width,height] duration-75"
        :style="{
          left: hover.x + 'px',
          top:  hover.y + 'px',
          width: hover.w + 'px',
          height: hover.h + 'px',
          background: 'rgba(124,58,237,0.08)',
          outline: '2px solid rgb(124,58,237)',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.06)',
        }"
      />
    </div>

    <!-- The launcher (FloatingLauncher) IS the toolbar while annotation is
         active — it shows the pin count, "+ Pin" / Cancel / Done controls.
         The launcher dispatches intents via useAnnotationState which this
         overlay watches below. -->

    <!-- Pins (existing + draft + just-submitted). Positions are VIEWPORT
         coords (the overlay root is fixed) recomputed on scroll/resize. -->
    <AnnotationPin
      v-for="r in renderedPins"
      :key="r.pin.id"
      :index="r.pin.index"
      :page-x="r.x"
      :page-y="r.y"
      :severity="pinSeverity(r.pin)"
      :status="pinStatus(r.pin)"
      :state="r.pin.state"
      :stale="r.stale"
      @open="openPin(r.pin.id)"
    />

    <!-- Composer for a freshly-dropped pin (PLACE mode → click → composer). -->
    <AnnotationPinComposer
      v-if="composingPin"
      :index="composingPin.index"
      :page-x="composerPos.x"
      :page-y="composerPos.y"
      :submitting="composingPin.submitting"
      :error="composingPin.error"
      :members="members"
      @submit="onComposerSubmit"
      @cancel="onComposerCancel"
    />

    <!-- Pin list lives in the launcher popover now (FAB → View pins). The
         overlay just publishes the rows + handles jump intents. -->

    <!-- Detail popover for an existing pin (VIEW mode → click → detail). -->
    <AnnotationPinDetail
      v-if="viewingPin"
      :index="viewingPin.index"
      :page-x="detailPos.x"
      :page-y="detailPos.y"
      :title="`Pin #${viewingPin.index}`"
      :summary="viewingPin.comment"
      :severity="viewingPin.severity"
      :issue-type="viewingPin.issueType"
      :status="viewingPin.status"
      :updating="statusUpdatingId === viewingPin.id"
      :stale="detailPos.stale"
      @close="viewingPinId = null"
      @open="viewingPin.issueId && openInDashboard(viewingPin.issueId)"
      @reanchor="startReanchor(viewingPin.id)"
      @change-status="onChangeStatus(viewingPin.id, $event)"
    />

    <!-- Finish-review dialog — names the grouped issue on Done. -->
    <div
      v-if="finishing"
      class="pointer-events-auto fixed inset-0 z-[2147483647] flex items-center justify-center"
      style="background: rgba(0,0,0,0.45)"
      @click.self="cancelFinish"
    >
      <div class="w-[360px] rounded-xl border border-border bg-card p-4 shadow-[0_24px_64px_rgba(0,0,0,0.3)]">
        <h3 class="text-[14px] font-semibold text-foreground">Finish review</h3>
        <p class="mt-1 text-[12px] text-muted-foreground">
          {{ sessionPinCount }} pin{{ sessionPinCount === 1 ? '' : 's' }} will be grouped into one issue.
        </p>
        <label class="mt-3 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Title</label>
        <input
          v-model="reviewTitle"
          type="text"
          class="mt-1 block w-full rounded-md border border-border bg-background px-2.5 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
          @keydown.enter.prevent="confirmFinish"
        />

        <!-- Duplicate warning: prior-session pins exist on this URL -->
        <div
          v-if="priorPinsCount > 0"
          class="mt-3 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-50/70 px-2.5 py-2 text-[11px] text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mt-px h-3 w-3 shrink-0"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span>
            <strong>{{ priorPinsCount }} pin{{ priorPinsCount === 1 ? '' : 's' }}</strong> from a previous session already exist on this page and will not be affected.
          </span>
        </div>

        <!-- Visibility note -->
        <p class="mt-2 text-[10px] text-muted-foreground">
          This review will be visible to all workspace members.
        </p>

        <div class="mt-3 flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" :disabled="finishBusy" @click="cancelFinish">Keep editing</Button>
          <Button variant="default" size="sm" :loading="finishBusy" @click="confirmFinish">Submit review</Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Button } from '@deveprobe/ui';
import AnnotationPin from './AnnotationPin.vue';
import AnnotationPinComposer, {
  type PinDraft,
  type AnnotationIssueType,
} from './AnnotationPinComposer.vue';
import AnnotationPinDetail from './AnnotationPinDetail.vue';
import type { PinListRow } from '../../../lib/annotation-state.js';
import { describeAnchor, resolveAnchor, type PinAnchor } from '../../../lib/anchor.js';
import { api, type AnnotationPinRow, type WorkspaceMember } from '../../../lib/api.js';
import { safeSendMessage } from '../../../lib/extension.js';
import { WEB_APP_URL } from '../../../lib/env.js';
import { useAnnotationState } from '../../../lib/annotation-state.js';
import type { BrowserMeta, Severity, IssueStatus } from '@deveprobe/shared';
import type { StoredAuth } from '../../../lib/auth.js';

const props = defineProps<{
  browserMeta: BrowserMeta;
  auth:        StoredAuth | null;
}>();

const emit = defineEmits<{ close: [] }>();

// ── Shared state w/ launcher ────────────────────────────────────────────────
// The launcher reads `mode` + `pinCount` to render its toolbar UI and fires
// place/cancel/exit intents back through the composable. Mounting this
// overlay flips `active = true`; unmounting flips it back.
const state = useAnnotationState();

// ── Mode ────────────────────────────────────────────────────────────────────
const mode = ref<'view' | 'place'>('view');

function enterPlaceMode() {
  if (composingPin.value) return;  // already composing — ignore
  viewingPinId.value = null;
  mode.value = 'place';
  state.setMode('place');
}
function exitPlaceMode() {
  hover.value = null;
  mode.value = 'view';
  state.setMode('view');
}

// Launcher → overlay intents. The launcher increments a counter for each
// click; the watcher fires once per increment (immutable+immediate is fine
// because the initial value is 0 and won't accidentally fire on mount).
watch(() => state.placeRequested.value, (v, prev) => {
  if (v !== prev) enterPlaceMode();
});
watch(() => state.cancelRequested.value, (v, prev) => {
  if (v !== prev) exitPlaceMode();
});
watch(() => state.exitRequested.value, (v, prev) => {
  if (v !== prev) onDone();
});

// ── Grouped-pin model ─────────────────────────────────────────────────────────
// Pins are now CHILDREN of one issue per session (not 1 issue/pin). The
// session + grouping issue are created lazily on the first pin; we cache
// their ids for the rest of the sitting.
const sessionId = ref<string | null>(null);
const issueId   = ref<string | null>(null);

// Workspace members for the assignee dropdown. Fetched once on mount.
const members = ref<WorkspaceMember[]>([]);

// Two on-screen states:
//   • existing — persisted pin (server row), clickable → detail
//   • draft    — just dropped, composer open, not yet saved
interface ExistingPin {
  kind:      'existing';
  id:        string;            // PIN id
  issueId:   string | null;     // grouping issue (for "View issue")
  index:     number;
  /** Document coords (fallback when the anchored element can't be re-resolved). */
  pageX:     number;
  pageY:     number;
  anchor:    PinAnchor;
  severity:  Severity;
  status:    IssueStatus;
  state:     'submitted';
  comment:   string;
  issueType: string | null;
}
interface DraftPin {
  kind:       'draft' | 'submitted';
  id:         string;          // local id
  index:      number;
  pageX:      number;
  pageY:      number;
  anchor:     PinAnchor;
  draft:      PinDraft;
  state:      'draft' | 'submitted';
  submitting: boolean;
  error?:     string;
}
type Pin = ExistingPin | DraftPin;

const existingPins = ref<ExistingPin[]>([]);
const localPins    = ref<DraftPin[]>([]);

const visiblePins = computed<Pin[]>(() => [
  ...existingPins.value,
  ...localPins.value,
]);

// ── Viewport positioning ────────────────────────────────────────────────────
// The overlay root is `position: fixed`, so children positioned `absolute`
// are anchored to the VIEWPORT, not the document. We therefore render every
// pin (and the open composer/detail) at VIEWPORT coordinates and recompute
// them on scroll / resize.
//
// Per pin, we prefer re-resolving the live element so the pin follows it
// through scroll AND layout shifts; we fall back to (documentCoord − scroll)
// when the element can't be found (stale anchor / element removed).
const viewportTick = ref(0);
let rafPending = false;
function onViewportChange() {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    viewportTick.value++;
    rafPending = false;
  });
}

/**
 * Current viewport position (px from viewport top-left) for a pin, plus
 * whether the anchored element could be re-resolved. `stale = true` means we
 * fell back to stored document coords because the element is gone — the UI
 * surfaces this and offers re-anchoring.
 */
function viewportPos(pin: Pin): { x: number; y: number; stale: boolean } {
  const anchor = pin.anchor;
  const resolved = resolveAnchor(anchor);
  if (resolved) {
    const r = resolved.el.getBoundingClientRect();
    return {
      x: r.left + anchor.offset.xPct * r.width,
      y: r.top  + anchor.offset.yPct * r.height,
      stale: false,
    };
  }
  // Fallback: stored document coords minus current scroll.
  return { x: pin.pageX - window.scrollX, y: pin.pageY - window.scrollY, stale: true };
}

interface RenderedPin {
  pin:   Pin;
  x:     number;
  y:     number;
  stale: boolean;
}
const renderedPins = computed<RenderedPin[]>(() => {
  void viewportTick.value; // re-run on scroll / resize
  return visiblePins.value.map((pin) => {
    const { x, y, stale } = viewportPos(pin);
    // Draft pins are never "stale" — they were just placed this session.
    return { pin, x, y, stale: pin.kind === 'existing' && stale };
  });
});

// Viewport position for the open composer's pin (follows scroll while typing).
const composerPos = computed(() => {
  void viewportTick.value;
  return composingPin.value ? viewportPos(composingPin.value) : { x: 0, y: 0, stale: false };
});
// Viewport position + stale flag for the open detail's pin.
const detailPos = computed(() => {
  void viewportTick.value;
  return viewingPin.value ? viewportPos(viewingPin.value) : { x: 0, y: 0, stale: false };
});

// ── Pin-list rows ────────────────────────────────────────────────────────────
const STATUS_DOT_BG: Record<string, string> = {
  open: 'bg-violet-500', triaged: 'bg-sky-500', in_progress: 'bg-amber-500',
  awaiting_verification: 'bg-blue-500', resolved: 'bg-emerald-500',
  verified: 'bg-emerald-600', reopened: 'bg-rose-500', archived: 'bg-neutral-400',
  draft: 'bg-neutral-400',
};
const SEVERITY_DOT_BG: Record<Severity, string> = {
  low: 'bg-neutral-500', medium: 'bg-amber-500', high: 'bg-orange-500', critical: 'bg-rose-500',
};

const pinListRows = computed<PinListRow[]>(() =>
  renderedPins.value.map((r) => {
    const status = pinStatus(r.pin);
    return {
      id:    r.pin.id,
      index: r.pin.index,
      title: r.pin.kind === 'existing' ? r.pin.comment : r.pin.draft.comment,
      statusLabel: status ? status.replace(/_/g, ' ') : 'draft',
      dotBg: status ? (STATUS_DOT_BG[status] ?? 'bg-violet-500') : SEVERITY_DOT_BG[pinSeverity(r.pin)],
      stale: r.stale,
    };
  }),
);

/** List row click → scroll the pin's element into view, then open it. */
function onJumpToPin(pinId: string) {
  const pin = visiblePins.value.find((p) => p.id === pinId);
  if (!pin) return;
  // Bring the anchored element into view (centered) so the pin is on-screen.
  const resolved = resolveAnchor(pin.anchor);
  if (resolved) {
    resolved.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else {
    window.scrollTo({ top: Math.max(0, pin.pageY - window.innerHeight / 2), behavior: 'smooth' });
  }
  openPin(pinId);
}

// Marker colour inputs differ by pin kind: existing pins carry severity +
// status directly; draft/submitted local pins keep severity inside `draft`
// and (for now) no status until the dashboard sets one.
function pinSeverity(pin: Pin): Severity {
  return pin.kind === 'existing' ? pin.severity : pin.draft.severity;
}
function pinStatus(pin: Pin): IssueStatus | undefined {
  // Existing pins → their real status. Local submitted pins default to 'open'
  // (that's the status createIssue assigns). Drafts → undefined (severity tint).
  if (pin.kind === 'existing') return pin.status;
  return pin.state === 'submitted' ? 'open' : undefined;
}

// The pin currently in composer (only ever a DraftPin in `draft` state).
const composingPinId = ref<string | null>(null);
const composingPin = computed<DraftPin | null>(() => {
  if (!composingPinId.value) return null;
  const pin = localPins.value.find((p) => p.id === composingPinId.value);
  return pin && pin.state === 'draft' ? pin : null;
});

// The pin currently shown in detail popover.
const viewingPinId = ref<string | null>(null);
const viewingPin = computed<ExistingPin | null>(() => {
  if (!viewingPinId.value) return null;
  return existingPins.value.find((p) => p.id === viewingPinId.value) ?? null;
});

// ── Hydrate existing pins ───────────────────────────────────────────────────
// Fetched once on mount. Re-render relies on the anchor data we wrote on
// creation (browserMeta.anchor) — if it's missing we fall back to skipping
// the pin so a broken row doesn't crash the overlay.
// Flip the shared state ON for the launcher to react to. Whatever was set
// last session is fine because we reset on setActive(false) when the
// overlay unmounts.
state.setActive(true);

onMounted(async () => {
  if (!props.auth?.token || !props.browserMeta.pageUrl) return;

  // Fetch existing pins + workspace members in parallel (both non-fatal).
  const [pinsResult, membersResult] = await Promise.allSettled([
    api.getPagePins(props.browserMeta.pageUrl),
    api.getWorkspaceMembers(),
  ]);

  if (pinsResult.status === 'fulfilled') {
    existingPins.value = pinsResult.value
      .map((row, i) => rowToExistingPin(row, i + 1))
      .filter((p): p is ExistingPin => p !== null);
  } else {
    console.warn('[DevProbe] failed to load existing pins:', pinsResult.reason);
  }

  if (membersResult.status === 'fulfilled') {
    members.value = membersResult.value;
  }
});

// Keep the launcher's pin count in sync with what's visible on the page.
watch(
  () => existingPins.value.length + localPins.value.filter((p) => p.state === 'submitted').length,
  (count) => state.setPinCount(count),
  { immediate: true },
);

// Publish pin rows to the launcher (its "View pins" sub-view renders them).
watch(pinListRows, (rows) => state.setPinRows(rows), { immediate: true });

// Launcher → overlay: jump to a pin (scroll + open).
watch(() => state.jumpRequested.value, (v, prev) => {
  if (v !== prev) onJumpToPin(state.jumpTargetId.value);
});

// Re-position pins on scroll (capture phase catches nested scroll containers
// too) + resize. rAF-throttled inside onViewportChange.
onMounted(() => {
  window.addEventListener('scroll', onViewportChange, true);
  window.addEventListener('resize', onViewportChange);
});

onBeforeUnmount(() => {
  state.setActive(false);
  window.removeEventListener('scroll', onViewportChange, true);
  window.removeEventListener('resize', onViewportChange);
});

/** Build a renderable ExistingPin from a server row. Returns null if anchor missing. */
function rowToExistingPin(row: AnnotationPinRow, index: number): ExistingPin | null {
  const anchor = row.anchor as unknown as PinAnchor;
  if (!anchor?.rect) return null;

  // Document-coords = anchor's rect (viewport at capture) + offset within +
  // scroll position at capture. Lets the pin sit at its original spot even
  // after the page has been scrolled when the user re-opens annotation.
  const pageX = anchor.rect.x + anchor.offset.xPct * anchor.rect.w + anchor.scroll.x;
  const pageY = anchor.rect.y + anchor.offset.yPct * anchor.rect.h + anchor.scroll.y;

  return {
    kind:      'existing',
    id:        row.id,
    issueId:   row.issueId,
    index,
    pageX,
    pageY,
    anchor,
    severity:  (row.severity ?? 'medium') as Severity,
    status:    (row.status ?? 'open') as IssueStatus,
    state:     'submitted',
    comment:   row.comment,
    issueType: row.issueType ?? null,
  };
}

// ── Hover highlight (PLACE only) ────────────────────────────────────────────
const hover = ref<{ x: number; y: number; w: number; h: number } | null>(null);
const overlayHostSelector = 'dp-annotation';

function isOverlayChrome(el: Element | null): boolean {
  if (!el) return false;
  const hostEl = document.querySelector(overlayHostSelector) as HTMLElement | null;
  return !!hostEl && hostEl.contains(el);
}

function elementAt(x: number, y: number): Element | null {
  const stack = document.elementsFromPoint(x, y);
  for (const el of stack) {
    if (isOverlayChrome(el)) continue;
    if (el === document.body || el === document.documentElement) continue;
    return meaningfulTarget(el);
  }
  return null;
}

// The deepest element under the cursor is usually too granular (a single
// <span>, an icon's <path>, a 2px wrapper) which makes the highlight feel
// jumpy. Walk up to a "meaningful" ancestor: skip tiny boxes and pure inline
// wrappers whose parent has nearly the same footprint. Stops as soon as the
// element is reasonably sized, or at a sensible structural boundary.
const MIN_TARGET_PX = 12;            // ignore boxes smaller than this
function meaningfulTarget(el: Element): Element {
  let cur: Element = el;
  for (let i = 0; i < 4; i++) {
    const parent = cur.parentElement;
    if (!parent || parent === document.body) break;

    const r = cur.getBoundingClientRect();
    const tooSmall = r.width < MIN_TARGET_PX || r.height < MIN_TARGET_PX;

    // Inline elements (span/a/em/strong/svg internals) read better when we
    // promote to their block parent, but only if the parent isn't a giant
    // section that would over-select.
    const style = window.getComputedStyle(cur);
    const isInline = style.display.startsWith('inline');

    if (tooSmall || isInline) {
      const pr = parent.getBoundingClientRect();
      // Don't promote to an element that fills most of the viewport — that's
      // an over-select (e.g. a full-width section). Cap parent area.
      const parentTooBig = pr.width * pr.height > window.innerWidth * window.innerHeight * 0.6;
      if (parentTooBig) break;
      cur = parent;
      continue;
    }
    break;
  }
  return cur;
}

// rAF-throttle the hover highlight so rapid pointer moves don't thrash layout
// reads (getBoundingClientRect) and the outline doesn't flicker.
let hoverRafPending = false;
let lastMove: { x: number; y: number } | null = null;
function onPlaceMove(e: MouseEvent) {
  if (composingPin.value) return;
  lastMove = { x: e.clientX, y: e.clientY };
  if (hoverRafPending) return;
  hoverRafPending = true;
  requestAnimationFrame(() => {
    hoverRafPending = false;
    if (!lastMove) return;
    const el = elementAt(lastMove.x, lastMove.y);
    if (!el) { hover.value = null; return; }
    const r = el.getBoundingClientRect();
    hover.value = { x: r.left, y: r.top, w: r.width, h: r.height };
  });
}

async function onPlaceClick(e: MouseEvent) {
  if (composingPin.value) return;
  const el = elementAt(e.clientX, e.clientY);
  if (!el) return;

  const anchor = describeAnchor(el, e.clientX, e.clientY);

  // Re-anchor flow: rebind an existing pin to the clicked element instead of
  // creating a new one.
  if (reanchoringPinId.value) {
    void applyReanchor(reanchoringPinId.value, anchor, e);
    return;
  }

  // First pin of the session → grab a CLEAN page screenshot (overlay hidden,
  // before the marker + composer paint) to use as the issue cover. We do this
  // before drawing the marker so the cover is a pristine shot of the page.
  if (!sessionId.value && !coverDataUrl.value) {
    coverDataUrl.value = await captureCleanScreenshot();
  }

  const id = `pin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const newIndex = visiblePins.value.length + 1;
  const pin: DraftPin = {
    kind:       'draft',
    id,
    index:      newIndex,
    pageX:      e.clientX + window.scrollX,
    pageY:      e.clientY + window.scrollY,
    anchor,
    draft:      { comment: '', severity: 'medium', issueType: 'visual_bug' as AnnotationIssueType },
    state:      'draft',
    submitting: false,
  };
  localPins.value.push(pin);
  composingPinId.value = id;
  hover.value = null;
}

// ── Cover screenshot ─────────────────────────────────────────────────────────
// Captured once per session on the first pin. Held until the grouping issue
// exists (first createPin), then uploaded as the issue's cover.
const coverDataUrl = ref<string | null>(null);

/** Hide all DevProbe overlay chrome, capture the viewport, then restore. */
async function captureCleanScreenshot(): Promise<string | null> {
  const hosts = ['dp-annotation', 'dp-launcher']
    .map((s) => document.querySelector(s) as HTMLElement | null);
  const prev = hosts.map((h) => h?.style.display ?? '');
  hosts.forEach((h) => { if (h) h.style.display = 'none'; });

  // Two rAFs so the browser paints the hidden state before we snapshot.
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

  let dataUrl: string | null = null;
  try {
    const cap = await safeSendMessage<{ ok: boolean; dataUrl?: string }>({ type: 'CAPTURE_VISIBLE_TAB' });
    dataUrl = cap?.ok ? (cap.dataUrl ?? null) : null;
  } catch { /* non-fatal — issue just won't have a cover */ }
  finally {
    hosts.forEach((h, i) => { if (h) h.style.display = prev[i]!; });
  }
  return dataUrl;
}

// ── Re-anchor a stale pin ────────────────────────────────────────────────────
// User clicked "Re-anchor" in the detail popover → enter place mode in
// re-anchor sub-mode. The next page click rebinds the pin's anchor and PATCHes
// browserMeta so the new anchor persists.
const reanchoringPinId = ref<string | null>(null);

function startReanchor(pinId: string) {
  reanchoringPinId.value = pinId;
  viewingPinId.value = null;
  mode.value = 'place';
  state.setMode('place');
}

async function applyReanchor(pinId: string, anchor: PinAnchor, e: MouseEvent) {
  const pin = existingPins.value.find((p) => p.id === pinId);
  reanchoringPinId.value = null;
  exitPlaceMode();
  if (!pin) return;

  // Optimistic local update so the marker jumps to the new spot immediately.
  pin.anchor = anchor;
  pin.pageX  = e.clientX + window.scrollX;
  pin.pageY  = e.clientY + window.scrollY;

  try {
    // Persist the new anchor on the PIN row.
    await api.updatePin(pinId, {
      anchor:  anchor as unknown as Record<string, unknown>,
      offsetX: anchor.offset.xPct,
      offsetY: anchor.offset.yPct,
    });
  } catch (err) {
    console.warn('[DevProbe] failed to persist re-anchor:', (err as Error).message);
  }
}

// ── Pin click handlers (VIEW) ───────────────────────────────────────────────
function openPin(pinId: string) {
  // Submitted local pin → just leave it visible (no detail UI yet; opening
  // the issue in the dashboard is the rich-detail path).
  // Existing pin → show detail popover.
  // Draft pin → re-open composer.
  const existing = existingPins.value.find((p) => p.id === pinId);
  if (existing) {
    viewingPinId.value = pinId;
    return;
  }
  const local = localPins.value.find((p) => p.id === pinId);
  if (local && local.state === 'draft' && !local.submitting) {
    composingPinId.value = pinId;
  }
}

function openInDashboard(issueId: string) {
  void safeSendMessage({ type: 'OPEN_TAB', url: `${WEB_APP_URL}/issue/${issueId}` });
  viewingPinId.value = null;
}

// ── Inline status change ─────────────────────────────────────────────────────
// Reviewers change a pin's status from the detail popover. We PATCH the issue
// then optimistically update the local pin so its marker re-colours instantly.
const statusUpdatingId = ref<string | null>(null);

async function onChangeStatus(pinId: string, status: IssueStatus) {
  const pin = existingPins.value.find((p) => p.id === pinId);
  if (!pin || pin.status === status) return;

  statusUpdatingId.value = pinId;
  const prev = pin.status;
  pin.status = status;  // optimistic — marker re-colours immediately
  try {
    await api.updatePin(pinId, { status });
  } catch (e) {
    pin.status = prev;  // revert on failure
    console.warn('[DevProbe] failed to update pin status:', (e as Error).message);
  } finally {
    statusUpdatingId.value = null;
  }
}

// ── Composer events ─────────────────────────────────────────────────────────
async function onComposerSubmit(draft: PinDraft) {
  const pin = composingPin.value;
  if (!pin) return;
  pin.draft = draft;
  pin.submitting = true;
  pin.error = undefined;

  if (!props.auth?.token) {
    pin.error = 'Connect a workspace before submitting.';
    pin.submitting = false;
    return;
  }

  try {
    const isFirstPin = !sessionId.value;

    // Save the pin into the CURRENT session (creating the session + grouping
    // issue lazily on the first pin). All pins this sitting share one issue.
    const res = await api.createPin({
      sessionId:  sessionId.value ?? undefined,
      issueId:    issueId.value ?? undefined,
      pageUrl:    props.browserMeta.pageUrl,
      anchor:     pin.anchor as unknown as Record<string, unknown>,
      offsetX:    pin.anchor.offset.xPct,
      offsetY:    pin.anchor.offset.yPct,
      comment:    draft.comment,
      severity:   draft.severity,
      issueType:  draft.issueType,
      assigneeId: draft.assigneeId ?? undefined,
      labels:     draft.labels.length ? draft.labels : undefined,
    });
    // Cache the session + issue for the rest of the sitting.
    sessionId.value = res.sessionId;
    issueId.value   = res.issueId;

    // First pin → upload the clean cover screenshot to the grouping issue.
    if (isFirstPin && coverDataUrl.value) {
      const { dataUrlToBlob } = await import('../../../lib/metadata.js');
      await api.uploadAttachment({
        blob:     dataUrlToBlob(coverDataUrl.value),
        filename: `cover-${res.issueId}.png`,
        type:     'screenshot',
        issueId:  res.issueId,
      }).catch(() => null);
      coverDataUrl.value = null;  // uploaded once
    }

    // Composer-attached images → upload as attachments on the GROUPING issue.
    for (const img of draft.images ?? []) {
      await api.uploadAttachment({
        blob:     img,
        filename: img.name || `image-${Date.now()}.png`,
        type:     'screenshot',
        issueId:  res.issueId,
      }).catch(() => null);
    }

    // Promote the local draft to an EXISTING pin so it's immediately
    // clickable → detail popover + status-changeable.
    composingPinId.value = null;
    localPins.value = localPins.value.filter((p) => p.id !== pin.id);
    existingPins.value.push({
      kind:      'existing',
      id:        res.pin.id,
      issueId:   res.issueId,
      index:     existingPins.value.length + 1,
      pageX:     pin.pageX,
      pageY:     pin.pageY,
      anchor:    pin.anchor,
      severity:  draft.severity,
      status:    'open',
      state:     'submitted',
      comment:   draft.comment,
      issueType: draft.issueType,
    });
    reindexPins();

    // Return to view mode + open the new pin so the user sees it landed.
    exitPlaceMode();
    viewingPinId.value = res.pin.id;
  } catch (e) {
    pin.error      = (e as Error).message || 'Could not submit pin. Please try again.';
    pin.submitting = false;
  }
}

/** Keep pin indices stable: existing pins first, then any open drafts. */
function reindexPins() {
  existingPins.value.forEach((p, i) => { p.index = i + 1; });
  localPins.value.forEach((p, i) => { p.index = existingPins.value.length + i + 1; });
}

function onComposerCancel() {
  const pin = composingPin.value;
  if (!pin) return;
  if (pin.state === 'draft' && !pin.submitting) {
    // Drop the draft entirely + re-index siblings.
    localPins.value = localPins.value.filter((p) => p.id !== pin.id);
    localPins.value.forEach((p, i) => { p.index = existingPins.value.length + i + 1; });
  }
  composingPinId.value = null;
  exitPlaceMode();
}

// ── Done → finish review (prompt for a title) ────────────────────────────────
// Pins persist live, so there's nothing to "save" on Done — but the user
// chose to name the review on finish. If this sitting created a session with
// pins, show the finish dialog; otherwise just exit.
const finishing   = ref(false);
const reviewTitle = ref('');
const finishBusy  = ref(false);

const sessionPinCount = computed(() =>
  // Pins added THIS sitting (existing pins that belong to our session's issue).
  existingPins.value.filter((p) => p.issueId === issueId.value).length,
);

// Pins from PRIOR sessions on this same URL (fetched on mount, before this
// session was created). Shown as a duplicate warning in the finish dialog.
const priorPinsCount = computed(() =>
  existingPins.value.filter((p) => p.issueId !== issueId.value).length,
);

function onDone() {
  // Drop an open draft (it was never saved).
  if (composingPin.value) onComposerCancel();

  if (sessionId.value && sessionPinCount.value > 0) {
    reviewTitle.value = defaultReviewTitle();
    finishing.value = true;
    return;
  }
  emit('close');
}

function defaultReviewTitle(): string {
  let host = props.browserMeta.pageUrl;
  try { host = new URL(props.browserMeta.pageUrl).host; } catch { /* keep */ }
  const n = sessionPinCount.value;
  return `Annotation review · ${host} · ${n} pin${n === 1 ? '' : 's'}`;
}

async function confirmFinish() {
  if (!sessionId.value) { emit('close'); return; }
  finishBusy.value = true;
  try {
    await api.submitSession(sessionId.value, reviewTitle.value.trim() || defaultReviewTitle());
  } catch (e) {
    console.warn('[DevProbe] failed to submit session:', (e as Error).message);
  } finally {
    finishBusy.value = false;
    finishing.value = false;
    emit('close');
  }
}

function cancelFinish() {
  // Back out of the finish dialog — stay in annotation (don't exit).
  finishing.value = false;
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return;
  // Esc precedence: finish dialog → composer → detail → place mode → exit.
  if (finishing.value)      { cancelFinish(); return; }
  if (composingPin.value)   { onComposerCancel(); return; }
  if (viewingPinId.value)   { viewingPinId.value = null; return; }
  if (mode.value === 'place'){ exitPlaceMode(); return; }
  onDone();
}

onMounted    (() => document.addEventListener('keydown', onKeyDown, true));
onBeforeUnmount(() => document.removeEventListener('keydown', onKeyDown, true));
</script>
