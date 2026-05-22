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

    <!-- Pins (existing + draft + just-submitted). Each marker is clickable. -->
    <AnnotationPin
      v-for="pin in visiblePins"
      :key="pin.id"
      :index="pin.index"
      :page-x="pin.pageX"
      :page-y="pin.pageY"
      :severity="pin.severity"
      :state="pin.state"
      @open="openPin(pin.id)"
    />

    <!-- Composer for a freshly-dropped pin (PLACE mode → click → composer). -->
    <AnnotationPinComposer
      v-if="composingPin"
      :index="composingPin.index"
      :page-x="composingPin.pageX"
      :page-y="composingPin.pageY"
      :submitting="composingPin.submitting"
      :error="composingPin.error"
      @submit="onComposerSubmit"
      @cancel="onComposerCancel"
    />

    <!-- Detail popover for an existing pin (VIEW mode → click → detail). -->
    <AnnotationPinDetail
      v-if="viewingPin"
      :index="viewingPin.index"
      :page-x="viewingPin.pageX"
      :page-y="viewingPin.pageY"
      :title="viewingPin.title"
      :summary="viewingPin.summary"
      :severity="viewingPin.severity"
      :issue-type="viewingPin.issueType"
      @close="viewingPinId = null"
      @open="openInDashboard(viewingPin.id)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import AnnotationPin from './AnnotationPin.vue';
import AnnotationPinComposer, {
  type PinDraft,
  type AnnotationIssueType,
} from './AnnotationPinComposer.vue';
import AnnotationPinDetail from './AnnotationPinDetail.vue';
import { describeAnchor, type PinAnchor } from '../../../lib/anchor.js';
import { api, type AnnotationPinRow } from '../../../lib/api.js';
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

// ── Pin model ───────────────────────────────────────────────────────────────
// Three states a pin can be in on screen:
//   • existing  — fetched from server, immutable in this session
//   • draft     — just dropped, composer open, not yet submitted
//   • submitted — just submitted in this session (renders green)
interface ExistingPin {
  kind:      'existing';
  id:        string;
  index:     number;
  pageX:     number;
  pageY:     number;
  severity:  Severity;
  status:    IssueStatus;
  state:     'submitted';
  // Detail-popover content
  title:     string;
  summary:   string | null;
  issueType: string | null;
}
interface DraftPin {
  kind:       'draft' | 'submitted';
  id:         string;          // local id
  issueId?:   string;          // set after server-side create
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
  try {
    const rows = await api.getAnnotationPins(props.browserMeta.pageUrl);
    existingPins.value = rows
      .map((row, i) => rowToExistingPin(row, i + 1))
      .filter((p): p is ExistingPin => p !== null);
  } catch (e) {
    // Non-fatal — the user can still drop new pins even if the fetch fails.
    console.warn('[DevProbe] failed to load existing pins:', (e as Error).message);
  }
});

// Keep the launcher's pin count in sync with what's visible on the page.
watch(
  () => existingPins.value.length + localPins.value.filter((p) => p.state === 'submitted').length,
  (count) => state.setPinCount(count),
  { immediate: true },
);

onBeforeUnmount(() => state.setActive(false));

/** Build a renderable ExistingPin from a server row. Returns null if anchor missing. */
function rowToExistingPin(row: AnnotationPinRow, index: number): ExistingPin | null {
  const meta = row.browserMeta ?? {};
  const anchor = (meta as { anchor?: PinAnchor }).anchor;
  if (!anchor) return null;

  // Document-coords = anchor's rect (viewport at capture) + offset within +
  // scroll position at capture. Lets the pin sit at its original spot even
  // after the page has been scrolled when the user re-opens annotation.
  const pageX = anchor.rect.x + anchor.offset.xPct * anchor.rect.w + anchor.scroll.x;
  const pageY = anchor.rect.y + anchor.offset.yPct * anchor.rect.h + anchor.scroll.y;

  return {
    kind:      'existing',
    id:        row.id,
    index,
    pageX,
    pageY,
    severity:  (row.severity ?? 'medium') as Severity,
    status:    (row.status ?? 'open') as IssueStatus,
    state:     'submitted',
    title:     row.title,
    summary:   row.summary,
    issueType: (meta as { issueType?: string }).issueType ?? null,
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
    return el;
  }
  return null;
}

function onPlaceMove(e: MouseEvent) {
  if (composingPin.value) return;
  const el = elementAt(e.clientX, e.clientY);
  if (!el) { hover.value = null; return; }
  const r = el.getBoundingClientRect();
  hover.value = { x: r.left, y: r.top, w: r.width, h: r.height };
}

function onPlaceClick(e: MouseEvent) {
  if (composingPin.value) return;
  const el = elementAt(e.clientX, e.clientY);
  if (!el) return;

  const anchor = describeAnchor(el, e.clientX, e.clientY);
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
    const issue = await api.createIssue({
      source:      'extension',
      mode:        'live_annotation',
      title:       deriveTitle(draft.comment),
      summary:     draft.comment,
      severity:    draft.severity,
      pageUrl:     props.browserMeta.pageUrl,
      browserMeta: {
        ...props.browserMeta,
        anchor:    pin.anchor,
        issueType: draft.issueType,
      },
    });

    // Best-effort viewport screenshot. Non-fatal — the pin still exists.
    const cap = await safeSendMessage<{ ok: boolean; dataUrl?: string }>({ type: 'CAPTURE_VISIBLE_TAB' });
    if (cap?.ok && cap.dataUrl) {
      const { dataUrlToBlob } = await import('../../../lib/metadata.js');
      await api.uploadAttachment({
        blob:     dataUrlToBlob(cap.dataUrl),
        filename: `pin-${issue.id}.png`,
        type:     'screenshot',
        issueId:  issue.id,
      }).catch(() => null);
    }

    pin.state       = 'submitted';
    pin.submitting  = false;
    pin.issueId     = issue.id;
    composingPinId.value = null;
    // Return to view mode automatically — the user has captured this one,
    // they need to deliberately click "+ Pin" again for the next one.
    exitPlaceMode();
  } catch (e) {
    pin.error      = (e as Error).message || 'Could not submit pin. Please try again.';
    pin.submitting = false;
  }
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

// ── Done / Esc ──────────────────────────────────────────────────────────────
function onDone() {
  const drafts = localPins.value.filter((p) => p.state === 'draft');
  if (drafts.length > 0) {
    const ok = window.confirm(
      `${drafts.length} pin${drafts.length === 1 ? '' : 's'} not submitted yet. Leave anyway?`,
    );
    if (!ok) return;
  }
  emit('close');
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return;
  // Esc precedence: close composer → close detail → exit place mode → exit overlay.
  if (composingPin.value)   { onComposerCancel(); return; }
  if (viewingPinId.value)   { viewingPinId.value = null; return; }
  if (mode.value === 'place'){ exitPlaceMode(); return; }
  onDone();
}

onMounted    (() => document.addEventListener('keydown', onKeyDown, true));
onBeforeUnmount(() => document.removeEventListener('keydown', onKeyDown, true));

// ── Helpers ─────────────────────────────────────────────────────────────────
function deriveTitle(comment: string): string {
  const firstLine = comment.split(/[\n.!?]/, 1)[0]?.trim() ?? '';
  return firstLine.slice(0, 100) || 'Annotation pin';
}
</script>
