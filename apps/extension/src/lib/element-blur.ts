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
 * Click an already-blurred element to remove the blur. Esc cancels picking.
 * `restoreAll()` clears every blur (called when the recording stops).
 */

const BLUR_VALUE   = 'blur(10px)';
const BLUR_DATA_ATTR = 'data-devprobe-blurred';

export interface ElementBlur {
  /** Enter pick mode. Hooks fire on enter/exit so callers can hide overlays. */
  pickAndBlur: (hooks?: { onBeforePick?: () => void; onAfterPick?: () => void }) => void;
  /** Restore every blurred element (call when the recording ends). */
  restoreAll: () => void;
  /** Currently blurred elements count. */
  count: () => number;
}

export function createElementBlur(): ElementBlur {
  // Element → its original inline `filter` value (so we can restore exactly).
  const blurred = new Map<HTMLElement, string>();
  let picking = false;

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

  function findCandidate(x: number, y: number): HTMLElement | null {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    if (!el || el === document.body || el === document.documentElement) return null;
    return el;
  }

  function pickAndBlur(hooks: { onBeforePick?: () => void; onAfterPick?: () => void } = {}) {
    if (picking) return;
    picking = true;
    hooks.onBeforePick?.();

    const prevCursor = document.body.style.cursor;
    document.body.style.cursor = 'crosshair';

    const highlight = document.createElement('div');
    Object.assign(highlight.style, {
      position:      'fixed',
      pointerEvents: 'none',
      border:        '2px solid rgb(124,58,237)',
      background:    'rgba(124,58,237,0.08)',
      borderRadius: '3px',
      boxShadow:     '0 0 0 1px rgba(0,0,0,0.08)',
      zIndex:        '2147483646',
      transition:    'transform 60ms, width 60ms, height 60ms',
      display:       'none',
    } as Partial<CSSStyleDeclaration>);
    document.body.appendChild(highlight);

    const onMove = (e: MouseEvent) => {
      const el = findCandidate(e.clientX, e.clientY);
      if (!el) { highlight.style.display = 'none'; return; }
      const r = el.getBoundingClientRect();
      highlight.style.display = 'block';
      highlight.style.left   = r.left   + 'px';
      highlight.style.top    = r.top    + 'px';
      highlight.style.width  = r.width  + 'px';
      highlight.style.height = r.height + 'px';
    };

    // Prevent the page from receiving the gesture. Capture phase + stopImmediatePropagation
    // catches everything before bubbling listeners.
    const swallow = (e: Event) => { e.preventDefault(); e.stopImmediatePropagation(); };

    const onDown = (e: MouseEvent) => swallow(e);
    const onUp   = (e: MouseEvent) => swallow(e);

    const onClick = (e: MouseEvent) => {
      swallow(e);
      const el = findCandidate(e.clientX, e.clientY);
      if (el) {
        if (el.hasAttribute(BLUR_DATA_ATTR)) removeBlur(el);
        else                                  applyBlur(el);
      }
      stop();
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { swallow(e); stop(); }
    };

    function stop() {
      picking = false;
      document.body.style.cursor = prevCursor;
      highlight.remove();
      document.removeEventListener('mousemove', onMove,  true);
      document.removeEventListener('mousedown', onDown,  true);
      document.removeEventListener('mouseup',   onUp,    true);
      document.removeEventListener('click',     onClick, true);
      document.removeEventListener('keydown',   onKey,   true);
      hooks.onAfterPick?.();
    }

    document.addEventListener('mousemove', onMove,  true);
    document.addEventListener('mousedown', onDown,  true);
    document.addEventListener('mouseup',   onUp,    true);
    document.addEventListener('click',     onClick, true);
    document.addEventListener('keydown',   onKey,   true);
  }

  function restoreAll() {
    for (const [el, prev] of blurred) {
      el.style.filter = prev;
      el.removeAttribute(BLUR_DATA_ATTR);
    }
    blurred.clear();
  }

  return { pickAndBlur, restoreAll, count: () => blurred.size };
}
