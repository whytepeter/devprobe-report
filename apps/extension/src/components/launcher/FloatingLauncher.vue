<!--
  FloatingLauncher — floating action button + compact command menu.
  Injected into every page via content script (shadow DOM).

  Two personalities:
    • DEFAULT     — hexagon FAB; menu lists Capture actions (Screenshot /
                    Annotate / Record).
    • ANNOTATING  — when an annotation session is active (useAnnotationState),
                    the FAB becomes the annotation toolbar: map-pin icon with
                    a pin-count badge; the menu offers "Start pinning" /
                    "Cancel pinning" + "Done". The top-of-page toolbar is gone
                    — this FAB is the single control surface.
-->
<template>
  <div class="pointer-events-auto">
    <!-- FAB
         IMPORTANT: do NOT use `var(--accent)` / `var(--border)` directly —
         those tokens are raw HSL components meant for `hsl(var(--token))`
         (shadcn pattern). Use the hex variants. -->
    <!-- Drag handle — appears on hover (or while dragging) just left of the
         FAB. This is the ONLY drag affordance; the FAB itself is click-only. -->
    <button
      v-show="hovering || dragging"
      type="button"
      aria-label="Drag DevProbe button"
      :style="handleStyle"
      :class="[
        'fixed z-[2147483647] flex h-7 w-6 items-center justify-center rounded-md',
        'border border-[rgba(0,0,0,0.08)] bg-[var(--bg-elevated)] text-[var(--text-muted)]',
        'shadow-[0_2px_8px_rgba(0,0,0,0.12)] transition-colors hover:text-[var(--text-primary)]',
        dragging ? 'cursor-grabbing' : 'cursor-grab',
      ]"
      @pointerdown.stop="onHandlePointerDown"
      @click.stop
      @mouseenter="onHoverEnter"
      @mouseleave="onHoverLeave"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" class="h-3.5 w-3.5">
        <circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/>
        <circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/>
        <circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/>
      </svg>
    </button>

    <!-- RECORDING — the launcher transforms into the recording toolbar pill,
         anchored at the (draggable) FAB position. -->
    <div
      v-if="recordingActive"
      ref="pillEl"
      :style="pillStyle"
      class="fixed z-[2147483647]"
      @mouseenter="onHoverEnter"
      @mouseleave="onHoverLeave"
    >
      <RecordingControlBar
        :state="recState"
        :elapsed-ms="recElapsedMs"
        :blur-active="recBlurActive"
        @toggle-pause="recording.requestTogglePause()"
        @add-blur="recording.requestBlur()"
        @stop="recording.requestStop()"
      />
    </div>

    <button
      v-else
      type="button"
      :aria-label="fabAriaLabel"
      :style="fabStyle"
      :class="[
        'fixed z-[2147483647]',
        'flex h-11 w-11 items-center justify-center rounded-full',
        'border cursor-pointer transition-[background-color,box-shadow,border-color,transform] duration-150',
        'focus-visible:outline-none active:scale-[0.95]',
        justActivated && 'dp-fab-attention',
      ]"
      @click.stop="toggleMenu"
      @mouseenter="onHoverEnter"
      @mouseleave="onHoverLeave"
    >
      <!-- Attention pulse — expanding amber rings on annotation activation. -->
      <template v-if="justActivated">
        <span class="pointer-events-none absolute inset-0 rounded-full bg-amber-400/60 animate-ping" />
        <span class="pointer-events-none absolute -inset-1 rounded-full ring-2 ring-amber-400/50 animate-pulse" />
      </template>

      <Transition
        enter-active-class="transition-[opacity,transform] duration-100"
        enter-from-class="opacity-0 scale-75"
        leave-active-class="transition-[opacity,transform] duration-100"
        leave-to-class="opacity-0 scale-75"
        mode="out-in"
      >
        <Icon v-if="menuOpen"   key="close"   name="x"        :size="16" :stroke-width="2.5"/>
        <Icon v-else-if="annotationActive" key="pin" name="map-pin" :size="17" :stroke-width="2"/>
        <Icon v-else            key="open"    name="hexagon"  :size="17" :stroke-width="1.75"/>
      </Transition>

      <!-- Pin-count badge — only while annotating + has pins + menu closed. -->
      <span
        v-if="annotationActive && pinCount > 0 && !menuOpen"
        class="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-none text-black ring-2 ring-[var(--bg-elevated)]"
      >
        {{ pinCount }}
      </span>
    </button>

    <!-- Command menu -->
    <Transition
      enter-active-class="transition-[opacity,transform] duration-150 ease-out"
      enter-from-class="opacity-0 translate-y-2 scale-[0.96]"
      leave-active-class="transition-[opacity,transform] duration-100 ease-in"
      leave-to-class="opacity-0 translate-y-2 scale-[0.96]"
    >
      <div
        v-if="menuOpen && !recordingActive"
        @click.stop
        :style="{ ...menuStyle, pointerEvents: 'auto' }"
        class="fixed z-[2147483647] w-[248px]
               rounded-2xl border border-[rgba(0,0,0,0.06)] bg-[var(--bg-elevated)] p-1.5
               shadow-[0_16px_48px_rgba(0,0,0,0.14),0_2px_8px_rgba(0,0,0,0.08)]"
      >
        <!-- Disconnected: connect prompt -->
        <ConnectPrompt v-if="!auth" />

        <!-- ANNOTATING — annotation controls replace the capture menu. -->
        <template v-else-if="annotationActive">
          <!-- PINS sub-view: list of pins on the page, with a back button. -->
          <template v-if="menuView === 'pins'">
            <div class="flex items-center gap-1.5 px-1.5 pb-1.5 pt-1">
              <button
                type="button"
                class="flex h-6 w-6 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-secondary hover:text-[var(--text-primary)] transition-colors"
                aria-label="Back"
                @click="menuView = 'main'"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5">
                  <path d="M15 18 l-6 -6 l6 -6"/>
                </svg>
              </button>
              <span class="text-[12px] font-semibold text-[var(--text-primary)]">
                Pins <span class="text-[var(--text-muted)]">· {{ pinRows.length }}</span>
              </span>
            </div>

            <!-- Filter -->
            <div class="px-1.5 pb-1.5">
              <input
                v-model="pinFilter"
                type="text"
                placeholder="Filter pins"
                class="w-full rounded-md border border-[rgba(0,0,0,0.08)] bg-[var(--bg-base,transparent)] px-2 h-7 text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
              />
            </div>

            <!-- Rows -->
            <div class="max-h-[260px] overflow-y-auto">
              <p v-if="filteredPinRows.length === 0" class="px-2.5 py-4 text-center text-[11px] text-[var(--text-muted)]">
                {{ pinRows.length === 0 ? 'No pins yet.' : 'No matches.' }}
              </p>
              <button
                v-for="row in filteredPinRows"
                :key="row.id"
                type="button"
                class="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-secondary"
                @click="onJumpToPin(row.id)"
              >
                <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" :class="row.dotBg">
                  {{ row.index }}
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-[12px] font-medium text-[var(--text-primary)]">{{ row.title || 'Untitled pin' }}</span>
                  <span class="mt-0.5 flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                    <span class="capitalize">{{ row.statusLabel }}</span>
                    <span v-if="row.stale" class="text-amber-600 dark:text-amber-400">· stale</span>
                  </span>
                </span>
              </button>
            </div>
          </template>

          <!-- MAIN annotation controls. -->
          <template v-else>
            <p class="flex items-center justify-between px-2.5 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
              <span>Annotation</span>
              <span class="font-mono normal-case tracking-normal">{{ pinCount }} {{ pinCount === 1 ? 'pin' : 'pins' }}</span>
            </p>

            <LauncherItem
              v-if="annotationMode === 'view'"
              icon="annotate"
              label="Start pinning"
              description="Click an element to drop a pin"
              @click="onStartPinning"
            />
            <LauncherItem
              v-else
              icon="close"
              label="Cancel pinning"
              description="Stop placing, keep existing pins"
              @click="onCancelPinning"
            />

            <LauncherItem
              v-if="pinCount > 0"
              icon="list"
              label="View pins"
              description="Browse + jump to pins"
              @click="menuView = 'pins'"
            />

            <LauncherItem
              icon="check"
              label="Done"
              description="Exit annotation"
              @click="onDoneAnnotation"
            />
          </template>
        </template>

        <!-- DEFAULT — capture actions. -->
        <template v-else>
          <p class="px-2.5 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
            Capture
          </p>

          <LauncherItem
            icon="screenshot"
            label="Screenshot"
            description="Capture this tab"
            @click="onScreenshot"
          />
          <LauncherItem
            icon="annotate"
            label="Annotate"
            description="Pin issues on the page"
            @click="onAnnotate"
          />
          <LauncherItem
            icon="record"
            label="Record"
            description="Capture a full bug report"
            @click="onRecord"
          />

          <!-- Developer overlay: existing pins on this page -->
          <div
            v-if="pageExistingCount && pageExistingCount > 0"
            class="mt-1.5 border-t border-[rgba(0,0,0,0.06)] pt-1.5"
          >
            <button
              type="button"
              class="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-secondary"
              @click="onViewExistingPins"
            >
              <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
                <svg viewBox="0 0 24 24" fill="currentColor" class="h-2.5 w-2.5"><circle cx="12" cy="12" r="4"/></svg>
              </span>
              <span class="min-w-0 flex-1">
                <span class="block text-[12px] font-medium text-[var(--text-primary)]">View existing pins</span>
                <span class="text-[10px] text-[var(--text-muted)]">{{ pageExistingCount }} pin{{ pageExistingCount === 1 ? '' : 's' }} on this page</span>
              </span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3 w-3 shrink-0 text-[var(--text-muted)]"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>

          <!-- Footer -->
          <div class="mt-1.5 border-t border-[rgba(0,0,0,0.06)] pt-1.5 px-2.5 pb-1">
            <p class="text-[10px] text-[var(--text-muted)]">
              DevProbe · <span class="text-[var(--accent)] font-medium">v0.1</span>
            </p>
          </div>
        </template>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { Icon } from '@deveprobe/ui';
import LauncherItem  from './LauncherItem.vue';
import ConnectPrompt from './ConnectPrompt.vue';
import RecordingControlBar from '../capture/recording/toolbar/RecordingControlBar.vue';
import { getAuth, onAuthChange, type StoredAuth } from '../../lib/auth.js';
import { api } from '../../lib/api.js';
import { useAnnotationState } from '../../lib/annotation-state.js';
import { useRecordingState } from '../../lib/recording-state.js';

const menuOpen = ref(false);
const auth     = ref<StoredAuth | null>(null);

// Developer overlay: count of existing pins for this URL — declared here,
// watch added below after annotationActive is available.
const pageExistingCount  = ref<number | null>(null);
let   existingCountFetched = false;

// Recording state — when active, the launcher renders the toolbar pill in
// place of the FAB (the content script drives the MediaRecorder + state).
const recording      = useRecordingState();
const recordingActive = recording.active;
const recState        = recording.state;
const recElapsedMs    = recording.elapsedMs;
const recBlurActive   = recording.blurActive;

// The recording pill is wider than the FAB, so anchoring its left edge at a
// bottom-right FAB position overflows the viewport. We measure the rendered
// pill width and clamp its left in `pillStyle` below.
const pillEl    = ref<HTMLElement | null>(null);
const pillWidth = ref(300); // estimate until measured
watch(recordingActive, async (active) => {
  if (!active) return;
  await nextTick();
  if (pillEl.value) pillWidth.value = pillEl.value.offsetWidth;
});

// ── Draggable position ───────────────────────────────────────────────────────
// FAB top-left in viewport px. Defaults to the bottom-right corner; user can
// drag it anywhere; persisted to localStorage so it sticks across reloads.
const FAB_SIZE   = 44;
const MARGIN     = 20;
const POS_KEY    = 'dp_fab_pos';
const MENU_WIDTH = 248;

const fabPos   = ref<{ left: number; top: number }>({ left: 0, top: 0 });
const dragging = ref(false);

function defaultPos() {
  return {
    left: window.innerWidth  - FAB_SIZE - MARGIN,
    top:  window.innerHeight - FAB_SIZE - MARGIN,
  };
}
function clampPos(p: { left: number; top: number }) {
  return {
    left: Math.max(8 + 28, Math.min(p.left, window.innerWidth  - FAB_SIZE - 8)), // +28 leaves room for the left handle
    top:  Math.max(8,      Math.min(p.top,  window.innerHeight - FAB_SIZE - 8)),
  };
}

// ── Hover (show the drag handle) ─────────────────────────────────────────────
// A short close-delay bridges the gap between the FAB and the handle so the
// handle doesn't vanish as the cursor travels between them.
const hovering = ref(false);
let hoverTimer: ReturnType<typeof setTimeout> | null = null;
function onHoverEnter() {
  if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
  hovering.value = true;
}
function onHoverLeave() {
  if (hoverTimer) clearTimeout(hoverTimer);
  hoverTimer = setTimeout(() => { hovering.value = false; }, 200);
}

// ── Drag (handle only) ───────────────────────────────────────────────────────
let pointerStart = { x: 0, y: 0 };
let posStart     = { left: 0, top: 0 };

function onHandlePointerDown(e: PointerEvent) {
  if (e.button !== 0) return;
  pointerStart = { x: e.clientX, y: e.clientY };
  posStart     = { ...fabPos.value };
  dragging.value = true;
  hovering.value = true;
  window.addEventListener('pointermove', onHandlePointerMove);
  window.addEventListener('pointerup',   onHandlePointerUp);
}
function onHandlePointerMove(e: PointerEvent) {
  const dx = e.clientX - pointerStart.x;
  const dy = e.clientY - pointerStart.y;
  fabPos.value = clampPos({ left: posStart.left + dx, top: posStart.top + dy });
}
function onHandlePointerUp() {
  window.removeEventListener('pointermove', onHandlePointerMove);
  window.removeEventListener('pointerup',   onHandlePointerUp);
  dragging.value = false;
  try { localStorage.setItem(POS_KEY, JSON.stringify(fabPos.value)); } catch { /* ignore */ }
}

function onWindowResize() { fabPos.value = clampPos(fabPos.value); }

// Drag handle sits just left of the FAB, vertically centered against it.
// During recording the launcher renders the (wider) pill; we clamp its left so
// it stays on-screen. Both the pill and the drag handle anchor off this value.
const anchorLeft = computed<number>(() => {
  if (!recordingActive.value) return fabPos.value.left;
  const maxLeft = window.innerWidth - pillWidth.value - 8;
  return Math.max(36, Math.min(fabPos.value.left, maxLeft));
});

const handleStyle = computed<Record<string, string>>(() => ({
  left: `${anchorLeft.value - 28}px`,
  top:  `${fabPos.value.top + (FAB_SIZE - 28) / 2}px`,
}));

const pillStyle = computed<Record<string, string>>(() => ({
  left: `${anchorLeft.value}px`,
  top:  `${fabPos.value.top}px`,
}));

// Menu anchors to the FAB: right-aligned to the FAB, opening up when the FAB
// sits in the lower half of the viewport, down otherwise.
const menuStyle = computed<Record<string, string>>(() => {
  const left = Math.max(8, Math.min(fabPos.value.left + FAB_SIZE - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8));
  const openUp = fabPos.value.top > window.innerHeight / 2;
  return openUp
    ? { left: `${left}px`, bottom: `${window.innerHeight - fabPos.value.top + 8}px` }
    : { left: `${left}px`, top: `${fabPos.value.top + FAB_SIZE + 8}px` };
});

// Shared annotation state (set by AnnotationOverlay). The launcher both
// reflects it (icon / badge / menu) and drives it (start / cancel / exit).
const annotationState = useAnnotationState();
const annotationActive = annotationState.active;
const annotationMode   = annotationState.mode;
const pinCount         = annotationState.pinCount;
const pinRows          = annotationState.pinRows;

// Which face of the annotation menu is showing: the controls, or the pin list.
const menuView  = ref<'main' | 'pins'>('main');
const pinFilter = ref('');
const filteredPinRows = computed(() => {
  const q = pinFilter.value.trim().toLowerCase();
  if (!q) return pinRows.value;
  return pinRows.value.filter((r) => r.title.toLowerCase().includes(q));
});

// Developer overlay: lazily fetch existing pins for this URL on the first
// time the default menu opens (not already annotating).
watch(menuOpen, async (open) => {
  if (!open || annotationActive.value || existingCountFetched || !auth.value) return;
  existingCountFetched = true;
  try {
    const rows = await api.getPagePins(location.href);
    pageExistingCount.value = rows.length;
  } catch { /* non-fatal */ }
});

// Attention burst: when annotation switches ON, ping the FAB for a few
// seconds so the user notices the controls have moved here.
const justActivated = ref(false);
let attentionTimer: ReturnType<typeof setTimeout> | null = null;
watch(annotationActive, (active) => {
  if (!active) {
    justActivated.value = false;
    menuView.value = 'main';   // reset so a fresh session opens on the controls
    return;
  }
  justActivated.value = true;
  if (attentionTimer) clearTimeout(attentionTimer);
  attentionTimer = setTimeout(() => { justActivated.value = false; }, 3200);
});

const fabAriaLabel = computed(() => {
  if (menuOpen.value)        return 'Close DevProbe';
  if (annotationActive.value) return 'Annotation controls';
  return 'Open DevProbe';
});

// FAB styling — kept in JS so we can compose the states from theme tokens
// without fighting Tailwind's arbitrary-value parser.
const fabStyle = computed<Record<string, string>>(() => {
  const pos = { left: `${fabPos.value.left}px`, top: `${fabPos.value.top}px` };
  if (menuOpen.value) {
    return {
      ...pos,
      backgroundColor: 'var(--accent-hex)',
      color:           '#fff',
      borderColor:     'transparent',
      boxShadow:       '0 4px 16px rgba(124,58,237,0.28)',
    };
  }
  // Active annotation → amber FAB so it reads as "a mode is on".
  if (annotationActive.value) {
    return {
      ...pos,
      backgroundColor: '#f59e0b',
      color:           '#000',
      borderColor:     'transparent',
      boxShadow:       '0 4px 16px rgba(245,158,11,0.32)',
    };
  }
  return {
    ...pos,
    backgroundColor: 'var(--bg-elevated)',
    color:           'var(--text-primary)',
    borderColor:     'rgba(0,0,0,0.06)',
    boxShadow:       '0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.08)',
  };
});

function toggleMenu() { menuOpen.value = !menuOpen.value; }
function closeMenu()  { menuOpen.value = false; menuView.value = 'main'; }

// ── Capture entry points (default menu) ──────────────────────────────────────
function onScreenshot() {
  closeMenu();
  window.dispatchEvent(new CustomEvent('dp:start-region-select'));
}
function onRecord() {
  closeMenu();
  window.dispatchEvent(new CustomEvent('dp:start-recording'));
}
function onAnnotate() {
  closeMenu();
  window.dispatchEvent(new CustomEvent('dp:start-annotation'));
}
function onViewExistingPins() {
  // Enter annotation in VIEW mode to browse existing pins on the page.
  closeMenu();
  window.dispatchEvent(new CustomEvent('dp:start-annotation'));
}

// ── Annotation controls (active menu) ────────────────────────────────────────
function onStartPinning() {
  closeMenu();
  annotationState.requestPlace();
}
function onCancelPinning() {
  closeMenu();
  annotationState.requestCancel();
}
function onDoneAnnotation() {
  closeMenu();
  annotationState.requestExit();
}
function onJumpToPin(id: string) {
  // Keep the pin-list open so the user can browse + jump between pins. The
  // jump scrolls the element into view and opens its detail popover on the
  // page; the launcher list stays put.
  annotationState.requestJump(id);
}

function onDocClick() { closeMenu(); }

let unsubscribeAuth: (() => void) | null = null;

onMounted(async () => {
  // Restore saved FAB position (or default to bottom-right), clamped to the
  // current viewport.
  let saved: { left: number; top: number } | null = null;
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (raw) saved = JSON.parse(raw) as { left: number; top: number };
  } catch { /* ignore */ }
  fabPos.value = clampPos(saved ?? defaultPos());

  document.addEventListener('click', onDocClick);
  window.addEventListener('resize', onWindowResize);
  auth.value = await getAuth();
  unsubscribeAuth = onAuthChange((next) => { auth.value = next; });
});
onUnmounted(() => {
  document.removeEventListener('click', onDocClick);
  window.removeEventListener('resize', onWindowResize);
  window.removeEventListener('pointermove', onHandlePointerMove);
  window.removeEventListener('pointerup',   onHandlePointerUp);
  unsubscribeAuth?.();
  if (attentionTimer) clearTimeout(attentionTimer);
  if (hoverTimer)     clearTimeout(hoverTimer);
});
</script>

<style scoped>
/* A single bounce on activation, layered on top of the ping rings, so the
   FAB physically nudges to catch the eye. Defined locally because the shadow
   root doesn't share the page's stylesheet. */
@keyframes dp-fab-bounce {
  0%   { transform: scale(1); }
  30%  { transform: scale(1.18); }
  55%  { transform: scale(0.94); }
  80%  { transform: scale(1.06); }
  100% { transform: scale(1); }
}
.dp-fab-attention {
  animation: dp-fab-bounce 0.6s ease-in-out;
}
</style>
