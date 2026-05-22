/**
 * Element-targeted blur for screen recording.
 *
 * Activates a "pick" mode where the user hovers any element on the page — a
 * violet highlight follows the cursor showing the element bounds. On click,
 * `filter: blur(10px)` is applied directly to that element so the blur:
 *
 *  - scrolls with the page (it lives on the element, not a fixed overlay),
 *  - is captured by the screen-capture stream (it's real CSS, not a separate layer),
 *  - only obscures the picked element, not whatever happens to be behind it.
 *
 * Pick mode is **sticky** — it stays on across multiple element clicks so the
 * user can blur many things in a row without re-toggling the toolbar button.
 * Clicking an already-blurred element removes the blur. Exit pick mode by:
 *   • clicking the blur button on the toolbar again (caller drives via stop()),
 *   • pressing Escape, or
 *   • the recording ending (caller calls restoreAll()).
 *
 * Events whose composed path includes the `ignoreEl` (typically the toolbar
 * shadow host) are NOT swallowed, so the toolbar stays interactive while
 * picking — that's how the user clicks the blur button to exit.
 */

const BLUR_VALUE    = 'blur(10px)';
const BLUR_DATA_ATTR = 'data-devprobe-blurred';

export interface ElementBlur {
  /** Enter sticky pick mode. Idempotent — calling while active is a no-op. */
  start: (hooks?: {
    onBeforeStart?: () => void;
    onPicked?:      (el: HTMLElement) => void;
    onStopped?:     () => void;
    /** Element whose subtree should NOT receive the swallow treatment (toolbar). */
    ignoreEl?:      Element | null;
  }) => void;
  /** Exit pick mode programmatically (e.g. user clicked the toolbar button again). */
  stop: () => void;
  /** Whether sticky pick mode is currently active. */
  isActive: () => boolean;
  /** Restore every blurred element (call when the recording ends). */
  restoreAll: () => void;
  /** Currently blurred elements count. */
  count: () => number;
}

export function createElementBlur(): ElementBlur {
  // Element → its original inline `filter` value (so we can restore exactly).
  const blurred = new Map<HTMLElement, string>();
  let stopFn: (() => void) | null = null;

  function applyBlur(el: HTMLElement) {
    if (blurred.has(el)) return;
    blurred.set(el, el.style.filter);
    el.style.filter = `${el.style.filter} ${BLUR_VALUE}`.trim();
    el.setAttribute(BLUR_DATA_ATTR, '');
  }

  function removeBlur(el: HTMLElement) {
    if (!blurred.has(el)) return;
    el.style.filter = blurred.get(el) ?? '';
    el.removeAttribute(BLUR_DATA_ATTR);
    blurred.delete(el);
  }

  function findCandidate(x: number, y: number, ignoreEl: Element | null): HTMLElement | null {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    if (!el || el === document.body || el === document.documentElement) return null;
    // Don't blur the toolbar host (or anything inside it).
    if (ignoreEl && (el === ignoreEl || ignoreEl.contains(el))) return null;
    return el;
  }

  function start(hooks: {
    onBeforeStart?: () => void;
    onPicked?:      (el: HTMLElement) => void;
    onStopped?:     () => void;
    ignoreEl?:      Element | null;
  } = {}) {
    if (stopFn) return;
    const ignoreEl = hooks.ignoreEl ?? null;
    hooks.onBeforeStart?.();

    const prevCursor = document.body.style.cursor;
    document.body.style.cursor = 'crosshair';

    const highlight = document.createElement('div');
    Object.assign(highlight.style, {
      position:      'fixed',
      pointerEvents: 'none',
      border:        '2px solid rgb(124,58,237)',
      background:    'rgba(124,58,237,0.08)',
      borderRadius:  '3px',
      boxShadow:     '0 0 0 1px rgba(0,0,0,0.08)',
      zIndex:        '2147483646',
      transition:    'transform 60ms, width 60ms, height 60ms',
      display:       'none',
    } as Partial<CSSStyleDeclaration>);
    document.body.appendChild(highlight);

    // True if an event originated inside the toolbar — let it through so the
    // user can click the toolbar's blur button to exit pick mode.
    const isInIgnored = (e: Event): boolean => {
      if (!ignoreEl) return false;
      const path = (e.composedPath?.() ?? []) as EventTarget[];
      for (const t of path) {
        if (t === ignoreEl) return true;
        if (t instanceof Element && ignoreEl.contains(t)) return true;
      }
      return false;
    };

    const onMove = (e: MouseEvent) => {
      if (isInIgnored(e)) { highlight.style.display = 'none'; return; }
      const el = findCandidate(e.clientX, e.clientY, ignoreEl);
      if (!el) { highlight.style.display = 'none'; return; }
      const r = el.getBoundingClientRect();
      highlight.style.display = 'block';
      highlight.style.left   = r.left   + 'px';
      highlight.style.top    = r.top    + 'px';
      highlight.style.width  = r.width  + 'px';
      highlight.style.height = r.height + 'px';
    };

    const swallow = (e: Event) => { e.preventDefault(); e.stopImmediatePropagation(); };

    const onDown = (e: MouseEvent) => { if (!isInIgnored(e)) swallow(e); };
    const onUp   = (e: MouseEvent) => { if (!isInIgnored(e)) swallow(e); };

    const onClick = (e: MouseEvent) => {
      // Toolbar clicks pass through untouched — the toolbar handles its own logic.
      if (isInIgnored(e)) return;
      swallow(e);
      const el = findCandidate(e.clientX, e.clientY, ignoreEl);
      if (el) {
        if (el.hasAttribute(BLUR_DATA_ATTR)) removeBlur(el);
        else                                  applyBlur(el);
        hooks.onPicked?.(el);
      }
      // NOTE: sticky — do NOT stop. Caller must call stop() to exit.
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { swallow(e); stop(); }
    };

    stopFn = () => {
      document.body.style.cursor = prevCursor;
      highlight.remove();
      document.removeEventListener('mousemove', onMove,  true);
      document.removeEventListener('mousedown', onDown,  true);
      document.removeEventListener('mouseup',   onUp,    true);
      document.removeEventListener('click',     onClick, true);
      document.removeEventListener('keydown',   onKey,   true);
      stopFn = null;
      hooks.onStopped?.();
    };

    document.addEventListener('mousemove', onMove,  true);
    document.addEventListener('mousedown', onDown,  true);
    document.addEventListener('mouseup',   onUp,    true);
    document.addEventListener('click',     onClick, true);
    document.addEventListener('keydown',   onKey,   true);
  }

  function stop() { stopFn?.(); }

  function restoreAll() {
    stop();
    for (const [el, prev] of blurred) {
      el.style.filter = prev;
      el.removeAttribute(BLUR_DATA_ATTR);
    }
    blurred.clear();
  }

  return {
    start,
    stop,
    isActive:   () => stopFn !== null,
    restoreAll,
    count:      () => blurred.size,
  };
}
