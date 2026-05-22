/**
 * Element anchoring for live annotation.
 *
 * Describes a DOM element well enough that the same node can be located
 * later — after re-renders, scroll, layout shifts, even minor DOM edits.
 *
 * v1 strategy (described in LIVE_ANNOTATION_SPEC.md → "Element Anchoring"):
 *   1. Stable test/semantic attributes  (data-testid, id, aria-label, role)
 *   2. CSS selector path                 (cap at 4 levels, prune to stable
 *                                          ancestors via the same attributes)
 *   3. Bounding rect + click offset      (viewport-relative fallback)
 *
 * Things explicitly NOT in v1 (parked, but the shape leaves room):
 *   • XPath
 *   • Accessible-name lookup beyond aria-label
 *   • Text fingerprint
 *   • Ancestor fingerprint
 *   • SDK component hints
 *
 * The describe payload is stored in `issue.browserMeta.anchor` so the issue
 * details page can read it back without a new DB column. When the dedicated
 * `pins` table ships, we'll move it there.
 */

/** Stable attributes we try first, in priority order. */
const STABLE_ATTRS = [
  "data-testid",
  "data-test",
  "data-cy",
  "id",
  "aria-label",
  "name",
] as const;

export interface PinAnchor {
  /** CSS selector path (the most portable single-string locator we have). */
  selector:        string;
  /** Tag name in lower case. */
  tag:             string;
  /** Most stable attribute we found — usually data-testid or id. Null if none. */
  stableAttr:      { name: string; value: string } | null;
  /** Optional aria-role for re-resolution fallback. */
  role:            string | null;
  /** Element's bounding rect at capture time (viewport-relative). */
  rect:            { x: number; y: number; w: number; h: number };
  /** Click offset within the element, as percentages 0..1. */
  offset:          { xPct: number; yPct: number };
  /** Viewport + DPR snapshot — lets us compare scales on resolve. */
  viewport:        { width: number; height: number; dpr: number };
  /** Scroll position at the moment of pinning (page-relative). */
  scroll:          { x: number; y: number };
  /** Page route + query at capture time. Query stored as a string so we can
   *  decide policy (strip vs keep) at resolution time. */
  url:             { pathname: string; search: string; hash: string };
}

/** Quote a CSS attribute value safely for a selector. */
function cssQuote(v: string): string {
  return `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** Pick the most stable selector segment for one element. */
function describeSegment(el: Element): string {
  for (const attr of STABLE_ATTRS) {
    const v = el.getAttribute(attr);
    if (v && v.length > 0 && v.length < 100) {
      // Don't anchor against `id`s that look auto-generated — common in
      // Material UI / Headless UI etc. Heuristic: pure digits + dashes only.
      if (attr === "id" && /^[\d-]+$/.test(v)) continue;
      return `${el.tagName.toLowerCase()}[${attr}=${cssQuote(v)}]`;
    }
  }
  // Fall back to tag + nth-of-type so the path is unambiguous up to its parent.
  const parent = el.parentElement;
  if (!parent) return el.tagName.toLowerCase();
  const sameTag = Array.from(parent.children).filter((c) => c.tagName === el.tagName);
  if (sameTag.length === 1) return el.tagName.toLowerCase();
  const idx = sameTag.indexOf(el) + 1;
  return `${el.tagName.toLowerCase()}:nth-of-type(${idx})`;
}

/** Build a CSS path from a stable ancestor down to the target. Capped depth. */
function describeSelector(target: Element): string {
  const segments: string[] = [];
  let el: Element | null = target;
  let depth = 0;
  while (el && el.nodeType === 1 && depth < 6) {
    const seg = describeSegment(el);
    segments.unshift(seg);
    // If we picked a stable attribute, the path is unique from here — stop.
    if (/\[(data-testid|data-test|data-cy|id|aria-label|name)=/.test(seg)) break;
    el = el.parentElement;
    depth++;
  }
  return segments.join(" > ");
}

/** Find the first stable attribute pair on the element (or null). */
function findStableAttr(el: Element): PinAnchor["stableAttr"] {
  for (const name of STABLE_ATTRS) {
    const value = el.getAttribute(name);
    if (value && value.length < 100) {
      if (name === "id" && /^[\d-]+$/.test(value)) continue;
      return { name, value };
    }
  }
  return null;
}

/**
 * Build a PinAnchor describing the click on `el` at viewport coordinates
 * `(clientX, clientY)`. Everything is captured synchronously so the snapshot
 * is consistent even if the page re-renders the next tick.
 */
export function describeAnchor(el: Element, clientX: number, clientY: number): PinAnchor {
  const rect = el.getBoundingClientRect();
  const offsetX = clientX - rect.left;
  const offsetY = clientY - rect.top;
  return {
    selector:   describeSelector(el),
    tag:        el.tagName.toLowerCase(),
    stableAttr: findStableAttr(el),
    role:       el.getAttribute("role"),
    rect: {
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      w: Math.round(rect.width),
      h: Math.round(rect.height),
    },
    offset: {
      xPct: rect.width  > 0 ? Math.max(0, Math.min(1, offsetX / rect.width))  : 0.5,
      yPct: rect.height > 0 ? Math.max(0, Math.min(1, offsetY / rect.height)) : 0.5,
    },
    viewport: {
      width:  window.innerWidth,
      height: window.innerHeight,
      dpr:    window.devicePixelRatio || 1,
    },
    scroll: { x: window.scrollX, y: window.scrollY },
    url:    {
      pathname: location.pathname,
      search:   location.search,
      hash:     location.hash,
    },
  };
}

/**
 * Try to relocate the element described by `anchor` in the current DOM.
 * Returns the element + a confidence tag, or null if nothing matched.
 *
 * Resolution order (matches the spec):
 *   1. The stable attribute → unique match if present
 *   2. The full CSS selector path
 *   3. (caller falls back to viewport rect placement)
 */
export function resolveAnchor(anchor: PinAnchor): {
  el:         Element;
  confidence: "stable-attr" | "selector";
} | null {
  // 1. Stable attribute → strongest signal.
  if (anchor.stableAttr) {
    const { name, value } = anchor.stableAttr;
    const match = document.querySelector(`${anchor.tag}[${name}=${cssQuote(value)}]`);
    if (match) return { el: match, confidence: "stable-attr" };
  }

  // 2. CSS selector path.
  try {
    const match = document.querySelector(anchor.selector);
    if (match) return { el: match, confidence: "selector" };
  } catch { /* invalid selector — fall through */ }

  return null;
}
