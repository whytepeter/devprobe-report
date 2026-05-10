/**
 * useAnnotationCanvas
 * ───────────────────
 * Composable that owns all canvas drawing state and operations for the
 * screenshot annotation editor.
 *
 * Storage model: shape-based (vector). Every drawn item is appended to
 * `shapes[]`. The canvas is the screenshot + every shape replayed on top.
 * This enables the **select** tool to hit-test, highlight, and delete
 * individual items — and keeps undo/redo memory-cheap.
 *
 * Tools:
 *   select  — click to select a shape; Delete/Backspace to remove
 *   pen     — pressure-sensitive freehand
 *   rect    — rounded rectangle
 *   circle  — ellipse
 *   arrow   — solid-head arrow
 *   text    — composable signals via `pendingText`; component shows an
 *             HTML input overlay; calls `commitText(value)` on submit
 *   blur    — drag a region; pixelates that area of the original screenshot
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import type { Ref } from 'vue';
import type {
  DrawTool, Shape, PenPt, TextShape, BlurShape,
} from './types.js';

// ── Constants ──────────────────────────────────────────────────────────────────
const DPR         = window.devicePixelRatio || 1;
const BASE_LW     = 3   * DPR;
const MIN_LW      = 1.5 * DPR;
const MAX_LW      = 4.5 * DPR;
const MIN_PX      = 3;
const SPEED_SCALE = 30;
const HIT_THRESH  = 12 * DPR;
const TEXT_FONT   = Math.round(20 * DPR);

interface Options {
  canvas:            Ref<HTMLCanvasElement | null>;
  screenshotDataUrl: Ref<string>;
  tool:              Ref<DrawTool>;
  color:             Ref<string>;
}

export function useAnnotationCanvas({ canvas, screenshotDataUrl, tool, color }: Options) {

  // ── Shape list & undo history ─────────────────────────────────────────────────
  const shapes      = ref<Shape[]>([]);
  const undoHistory = ref<Shape[][]>([]);   // each = shapes BEFORE the change
  const redoHistory = ref<Shape[][]>([]);

  const selectedIdx = ref<number | null>(null);
  const hoveredIdx  = ref<number | null>(null);
  const hasSelection = computed(() => selectedIdx.value !== null);
  const isGrabbing  = ref(false);

  /** Set when text-tool clicks; component shows an input overlay there. */
  const pendingText = ref<{ canvasX: number; canvasY: number } | null>(null);

  const bitmapW = ref(0);
  const bitmapH = ref(0);

  let screenshotImg: HTMLImageElement | null = null;

  // ── Derived ──────────────────────────────────────────────────────────────────
  const canUndo = computed(() => undoHistory.value.length > 0);
  const canRedo = computed(() => redoHistory.value.length > 0);

  const cursorForTool = computed((): string => {
    if (tool.value === 'grab') {
      if (isGrabbing.value) return 'grabbing';
      return hoveredIdx.value !== null || selectedIdx.value !== null ? 'grab' : 'default';
    }
    if (tool.value === 'text') return 'text';
    return 'crosshair';
  });

  // ── Canvas helpers ────────────────────────────────────────────────────────────
  function ctx() { return canvas.value?.getContext('2d') ?? null; }

  function toCanvasPx(e: MouseEvent): [number, number] {
    const el   = canvas.value!;
    const rect = el.getBoundingClientRect();
    return [
      (e.clientX - rect.left) * (el.width  / rect.width),
      (e.clientY - rect.top)  * (el.height / rect.height),
    ];
  }

  // Selection clears whenever tool changes away from grab
  watch(tool, (t) => {
    if (t !== 'grab') { selectedIdx.value = null; hoveredIdx.value = null; redraw(); }
    if (t !== 'text') pendingText.value = null;
  });

  // ── Screenshot loading ────────────────────────────────────────────────────────
  watch(screenshotDataUrl, loadScreenshot, { immediate: true });

  async function loadScreenshot(url: string) {
    if (!url) return;
    const img = new Image();
    img.src   = url;
    await img.decode();
    screenshotImg = img;
    initCanvas(img);
  }

  function initCanvas(img: HTMLImageElement) {
    const el = canvas.value;
    if (!el) return;
    el.width  = img.naturalWidth;
    el.height = img.naturalHeight;
    bitmapW.value = img.naturalWidth;
    bitmapH.value = img.naturalHeight;
    redraw();
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeydown);
    if (screenshotImg) initCanvas(screenshotImg);
  });
  onUnmounted(() => window.removeEventListener('keydown', onKeydown));

  // ── Redraw (full repaint from shape list) ─────────────────────────────────────
  function redraw() {
    const c  = ctx();
    const el = canvas.value;
    if (!c || !el || !screenshotImg) return;
    c.clearRect(0, 0, el.width, el.height);
    c.drawImage(screenshotImg, 0, 0);
    for (const s of shapes.value) drawShape(c, s);
    if (selectedIdx.value !== null) {
      const s = shapes.value[selectedIdx.value];
      if (s) drawSelectionBox(c, s);
    }
  }

  // ── Shape rendering ──────────────────────────────────────────────────────────
  function drawShape(c: CanvasRenderingContext2D, s: Shape) {
    switch (s.type) {
      case 'pen':    drawPen   (c, s.pts, s.color); break;
      case 'rect':   drawRect  (c, s.x1, s.y1, s.x2, s.y2, s.color, s.lw); break;
      case 'circle': drawCircle(c, s.x1, s.y1, s.x2, s.y2, s.color, s.lw); break;
      case 'arrow':  drawArrow (c, s.x1, s.y1, s.x2, s.y2, s.color, s.lw); break;
      case 'text':   drawText  (c, s); break;
      case 'blur':   drawBlur  (c, s); break;
    }
  }

  function drawPen(c: CanvasRenderingContext2D, pts: PenPt[], col: string) {
    if (pts.length < 2) return;
    c.lineCap  = 'round';
    c.lineJoin = 'round';
    for (let i = 1; i < pts.length; i++) {
      c.beginPath();
      c.strokeStyle = col;
      c.lineWidth   = pts[i].w;
      if (i === 1) {
        c.moveTo(pts[0].x, pts[0].y);
        c.lineTo(pts[1].x, pts[1].y);
      } else {
        const mx0 = (pts[i-2].x + pts[i-1].x) / 2;
        const my0 = (pts[i-2].y + pts[i-1].y) / 2;
        const mx1 = (pts[i-1].x + pts[i].x) / 2;
        const my1 = (pts[i-1].y + pts[i].y) / 2;
        c.moveTo(mx0, my0);
        c.quadraticCurveTo(pts[i-1].x, pts[i-1].y, mx1, my1);
      }
      c.stroke();
    }
  }

  function drawRect(c: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, col: string, lw: number) {
    c.strokeStyle = col;
    c.lineWidth   = lw;
    c.lineCap     = 'round';
    c.lineJoin    = 'round';
    const r = lw * 1.5;
    const x = Math.min(x1, x2), y = Math.min(y1, y2);
    const w = Math.abs(x2 - x1), h = Math.abs(y2 - y1);
    c.beginPath();
    c.roundRect(x, y, w, h, r);
    c.stroke();
  }

  function drawCircle(c: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, col: string, lw: number) {
    c.strokeStyle = col;
    c.lineWidth   = lw;
    c.lineCap     = 'round';
    c.beginPath();
    c.ellipse((x1+x2)/2, (y1+y2)/2, Math.abs(x2-x1)/2, Math.abs(y2-y1)/2, 0, 0, Math.PI*2);
    c.stroke();
  }

  function drawArrow(c: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, col: string, lw: number) {
    const dist = Math.hypot(x2-x1, y2-y1);
    if (dist < 4) return;
    const angle    = Math.atan2(y2-y1, x2-x1);
    const headLen  = Math.max(22 * DPR, lw * 5);
    const headAng  = Math.PI / 6;
    const shaftEnd = dist - headLen * 0.8;
    const sx2 = x1 + Math.cos(angle) * shaftEnd;
    const sy2 = y1 + Math.sin(angle) * shaftEnd;

    c.strokeStyle = col;
    c.lineWidth   = lw;
    c.lineCap     = 'round';
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(sx2, sy2);
    c.stroke();

    c.fillStyle = col;
    c.beginPath();
    c.moveTo(x2, y2);
    c.lineTo(x2 - headLen*Math.cos(angle-headAng), y2 - headLen*Math.sin(angle-headAng));
    c.lineTo(x2 - headLen*Math.cos(angle+headAng), y2 - headLen*Math.sin(angle+headAng));
    c.closePath();
    c.fill();
  }

  function drawText(c: CanvasRenderingContext2D, s: TextShape) {
    c.fillStyle    = s.color;
    c.font         = `600 ${s.fontSize}px Geist, system-ui, sans-serif`;
    c.textBaseline = 'top';
    // multi-line support
    const lines = s.text.split('\n');
    const lh = s.fontSize * 1.25;
    for (let i = 0; i < lines.length; i++) c.fillText(lines[i], s.x, s.y + i * lh);
  }

  /** Pixelate a region of the *original* screenshot (idempotent across redraws). */
  function drawBlur(c: CanvasRenderingContext2D, s: BlurShape) {
    if (!screenshotImg || s.w < 2 || s.h < 2) return;
    const PIXEL = 14 * DPR;
    const tw = Math.max(1, Math.ceil(s.w / PIXEL));
    const th = Math.max(1, Math.ceil(s.h / PIXEL));
    const tmp = document.createElement('canvas');
    tmp.width = tw; tmp.height = th;
    const tc = tmp.getContext('2d')!;
    tc.imageSmoothingEnabled = true;
    tc.drawImage(screenshotImg, s.x, s.y, s.w, s.h, 0, 0, tw, th);
    c.save();
    c.imageSmoothingEnabled = false;
    c.drawImage(tmp, 0, 0, tw, th, s.x, s.y, s.w, s.h);
    c.restore();
  }

  function drawSelectionBox(c: CanvasRenderingContext2D, s: Shape) {
    const b   = getBounds(c, s);
    const pad = 8 * DPR;
    c.save();
    c.strokeStyle = '#7c3aed';
    c.lineWidth   = 1.5 * DPR;
    c.setLineDash([6 * DPR, 4 * DPR]);
    c.strokeRect(b.x - pad, b.y - pad, b.w + pad*2, b.h + pad*2);
    c.restore();
  }

  // ── Bounds & hit testing ──────────────────────────────────────────────────────
  function getBounds(c: CanvasRenderingContext2D, s: Shape) {
    switch (s.type) {
      case 'pen': {
        let xMin = Infinity, yMin = Infinity, xMax = -Infinity, yMax = -Infinity;
        for (const p of s.pts) {
          if (p.x < xMin) xMin = p.x; if (p.x > xMax) xMax = p.x;
          if (p.y < yMin) yMin = p.y; if (p.y > yMax) yMax = p.y;
        }
        return { x: xMin, y: yMin, w: xMax - xMin, h: yMax - yMin };
      }
      case 'rect':
      case 'circle':
      case 'arrow': {
        const x = Math.min(s.x1, s.x2), y = Math.min(s.y1, s.y2);
        return { x, y, w: Math.abs(s.x2 - s.x1), h: Math.abs(s.y2 - s.y1) };
      }
      case 'text': {
        c.font = `600 ${s.fontSize}px Geist, system-ui, sans-serif`;
        const lines = s.text.split('\n');
        const w = Math.max(...lines.map(l => c.measureText(l).width));
        const h = lines.length * s.fontSize * 1.25;
        return { x: s.x, y: s.y, w, h };
      }
      case 'blur':
        return { x: s.x, y: s.y, w: s.w, h: s.h };
    }
  }

  function hitTest(x: number, y: number): number | null {
    const c = ctx();
    if (!c) return null;
    for (let i = shapes.value.length - 1; i >= 0; i--) {
      if (hitTestShape(c, shapes.value[i], x, y)) return i;
    }
    return null;
  }

  function hitTestShape(c: CanvasRenderingContext2D, s: Shape, x: number, y: number): boolean {
    switch (s.type) {
      case 'pen':
        return s.pts.some(p => Math.hypot(p.x - x, p.y - y) < HIT_THRESH);
      case 'rect': {
        const bx = Math.min(s.x1, s.x2), bX = Math.max(s.x1, s.x2);
        const by = Math.min(s.y1, s.y2), bY = Math.max(s.y1, s.y2);
        const onTop    = y >= by - HIT_THRESH && y <= by + HIT_THRESH && x >= bx - HIT_THRESH && x <= bX + HIT_THRESH;
        const onBot    = y >= bY - HIT_THRESH && y <= bY + HIT_THRESH && x >= bx - HIT_THRESH && x <= bX + HIT_THRESH;
        const onLeft   = x >= bx - HIT_THRESH && x <= bx + HIT_THRESH && y >= by - HIT_THRESH && y <= bY + HIT_THRESH;
        const onRight  = x >= bX - HIT_THRESH && x <= bX + HIT_THRESH && y >= by - HIT_THRESH && y <= bY + HIT_THRESH;
        return onTop || onBot || onLeft || onRight;
      }
      case 'circle': {
        const cx = (s.x1 + s.x2) / 2, cy = (s.y1 + s.y2) / 2;
        const rx = Math.abs(s.x2 - s.x1) / 2, ry = Math.abs(s.y2 - s.y1) / 2;
        if (rx < 1 || ry < 1) return false;
        const nx = (x - cx) / rx, ny = (y - cy) / ry;
        const d  = Math.sqrt(nx*nx + ny*ny);
        return Math.abs(d - 1) * Math.min(rx, ry) < HIT_THRESH;
      }
      case 'arrow':
        return distToSegment(x, y, s.x1, s.y1, s.x2, s.y2) < HIT_THRESH;
      case 'text':
      case 'blur': {
        const b = getBounds(c, s);
        return x >= b.x - HIT_THRESH && x <= b.x + b.w + HIT_THRESH &&
               y >= b.y - HIT_THRESH && y <= b.y + b.h + HIT_THRESH;
      }
    }
  }

  function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
    const dx = bx - ax, dy = by - ay;
    const len2 = dx*dx + dy*dy;
    if (len2 === 0) return Math.hypot(px - ax, py - ay);
    const t = Math.max(0, Math.min(1, ((px - ax)*dx + (py - ay)*dy) / len2));
    return Math.hypot(px - (ax + t*dx), py - (ay + t*dy));
  }

  // ── Undo / Redo / Delete ──────────────────────────────────────────────────────
  function pushUndo(prev: Shape[]) {
    undoHistory.value = [...undoHistory.value.slice(-29), prev];
    redoHistory.value = [];
  }

  function undo() {
    if (!undoHistory.value.length) return;
    const hist = [...undoHistory.value];
    const prev = hist.pop()!;
    undoHistory.value = hist;
    redoHistory.value = [...redoHistory.value, [...shapes.value]];
    shapes.value      = prev;
    selectedIdx.value = null;
    redraw();
  }

  function redo() {
    if (!redoHistory.value.length) return;
    const hist = [...redoHistory.value];
    const next = hist.pop()!;
    redoHistory.value = hist;
    undoHistory.value = [...undoHistory.value, [...shapes.value]];
    shapes.value      = next;
    selectedIdx.value = null;
    redraw();
  }

  function deleteSelected() {
    if (selectedIdx.value === null) return;
    pushUndo([...shapes.value]);
    shapes.value      = shapes.value.filter((_, i) => i !== selectedIdx.value);
    selectedIdx.value = null;
    redraw();
  }

  // ── Drag state ────────────────────────────────────────────────────────────────
  let dragging   = false;
  let startX     = 0;
  let startY     = 0;
  let lastCX     = 0;
  let lastCY     = 0;
  let previewSnap: ImageData | null = null;
  let shapesAtDrawStart: Shape[] = [];
  let penPts: PenPt[] = [];
  let prevCX = 0;
  let prevCY = 0;

  // Grab-tool drag (move a selected shape)
  let grabStartShape: Shape | null = null;
  let grabStartShapesArr: Shape[] = [];

  function translateShape(s: Shape, dx: number, dy: number): Shape {
    switch (s.type) {
      case 'pen':
        return { ...s, pts: s.pts.map(p => ({ ...p, x: p.x + dx, y: p.y + dy })) };
      case 'rect':
      case 'circle':
      case 'arrow':
        return { ...s, x1: s.x1 + dx, y1: s.y1 + dy, x2: s.x2 + dx, y2: s.y2 + dy };
      case 'text':
      case 'blur':
        return { ...s, x: s.x + dx, y: s.y + dy };
    }
  }

  // ── Text tool ─────────────────────────────────────────────────────────────────
  function commitText(text: string) {
    const pos = pendingText.value;
    pendingText.value = null;
    if (!pos) return;
    const t = text.trim();
    if (!t) return;
    pushUndo([...shapes.value]);
    shapes.value = [...shapes.value, {
      type: 'text', x: pos.canvasX, y: pos.canvasY,
      text: t, color: color.value, fontSize: TEXT_FONT,
    }];
    redraw();
  }

  function cancelText() { pendingText.value = null; }

  // ── Mouse handlers ────────────────────────────────────────────────────────────
  function onMousedown(e: MouseEvent) {
    if (e.button !== 0) return;
    const [cx, cy] = toCanvasPx(e);
    lastCX = cx; lastCY = cy;

    if (tool.value === 'grab') {
      const idx = hitTest(cx, cy);
      selectedIdx.value = idx;
      if (idx !== null) {
        // Begin moving the selected shape
        isGrabbing.value   = true;
        startX             = cx;
        startY             = cy;
        grabStartShape     = shapes.value[idx];
        grabStartShapesArr = [...shapes.value];
      }
      redraw();
      return;
    }

    if (tool.value === 'text') {
      pendingText.value = { canvasX: cx, canvasY: cy };
      return;
    }

    dragging = true;
    startX = cx; startY = cy;
    prevCX = cx; prevCY = cy;
    penPts = [{ x: cx, y: cy, w: BASE_LW }];
    shapesAtDrawStart = [...shapes.value];
    previewSnap = ctx()?.getImageData(0, 0, canvas.value!.width, canvas.value!.height) ?? null;
  }

  function onMousemove(e: MouseEvent) {
    const [cx, cy] = toCanvasPx(e);
    lastCX = cx; lastCY = cy;

    if (tool.value === 'grab') {
      if (isGrabbing.value && grabStartShape && selectedIdx.value !== null) {
        // Move the selected shape
        const dx = cx - startX;
        const dy = cy - startY;
        const moved = translateShape(grabStartShape, dx, dy);
        const next  = [...shapes.value];
        next[selectedIdx.value] = moved;
        shapes.value = next;
        redraw();
      } else {
        // Hover detection (for cursor change)
        const idx = hitTest(cx, cy);
        if (idx !== hoveredIdx.value) hoveredIdx.value = idx;
      }
      return;
    }

    if (!dragging || !previewSnap) return;
    const c = ctx();
    if (!c) return;

    if (tool.value === 'pen') {
      const dist = Math.hypot(cx - prevCX, cy - prevCY);
      if (dist < MIN_PX) return;
      const t = Math.min(dist / SPEED_SCALE, 1);
      penPts.push({ x: cx, y: cy, w: MAX_LW - t * (MAX_LW - MIN_LW) });
      prevCX = cx; prevCY = cy;
    }

    c.putImageData(previewSnap, 0, 0);

    switch (tool.value) {
      case 'pen':    drawPen   (c, penPts, color.value); break;
      case 'rect':   drawRect  (c, startX, startY, cx, cy, color.value, BASE_LW); break;
      case 'circle': drawCircle(c, startX, startY, cx, cy, color.value, BASE_LW); break;
      case 'arrow':  drawArrow (c, startX, startY, cx, cy, color.value, BASE_LW); break;
      case 'blur':   previewBlurRect(c, startX, startY, cx, cy); break;
    }
  }

  function previewBlurRect(c: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
    const x = Math.min(x1, x2), y = Math.min(y1, y2);
    const w = Math.abs(x2 - x1), h = Math.abs(y2 - y1);
    c.save();
    c.fillStyle = 'rgba(124, 58, 237, 0.18)';
    c.fillRect(x, y, w, h);
    c.strokeStyle = '#7c3aed';
    c.lineWidth   = 1.5 * DPR;
    c.setLineDash([6 * DPR, 4 * DPR]);
    c.strokeRect(x, y, w, h);
    c.restore();
  }

  function onMouseup() {
    // Commit a grab-move
    if (isGrabbing.value) {
      isGrabbing.value = false;
      if (grabStartShape && selectedIdx.value !== null) {
        const cur = shapes.value[selectedIdx.value];
        if (cur !== grabStartShape) {
          // Position changed — push a single undo entry for the whole move
          pushUndo(grabStartShapesArr);
        }
      }
      grabStartShape     = null;
      grabStartShapesArr = [];
      redraw();
      return;
    }

    if (!dragging) return;
    dragging = false;

    let newShape: Shape | null = null;
    switch (tool.value) {
      case 'pen':
        if (penPts.length >= 2) newShape = { type: 'pen', pts: [...penPts], color: color.value };
        break;
      case 'rect':
        if (Math.abs(lastCX - startX) > 2 && Math.abs(lastCY - startY) > 2)
          newShape = { type: 'rect', x1: startX, y1: startY, x2: lastCX, y2: lastCY, color: color.value, lw: BASE_LW };
        break;
      case 'circle':
        if (Math.abs(lastCX - startX) > 2 && Math.abs(lastCY - startY) > 2)
          newShape = { type: 'circle', x1: startX, y1: startY, x2: lastCX, y2: lastCY, color: color.value, lw: BASE_LW };
        break;
      case 'arrow':
        if (Math.hypot(lastCX - startX, lastCY - startY) > 4)
          newShape = { type: 'arrow', x1: startX, y1: startY, x2: lastCX, y2: lastCY, color: color.value, lw: BASE_LW };
        break;
      case 'blur': {
        const x = Math.min(startX, lastCX), y = Math.min(startY, lastCY);
        const w = Math.abs(lastCX - startX), h = Math.abs(lastCY - startY);
        if (w > 4 && h > 4) newShape = { type: 'blur', x, y, w, h };
        break;
      }
    }

    if (newShape) {
      pushUndo(shapesAtDrawStart);
      shapes.value = [...shapesAtDrawStart, newShape];
      redraw();
    } else if (previewSnap) {
      // No shape created — just restore the canvas to its pre-drag state
      ctx()?.putImageData(previewSnap, 0, 0);
    }

    previewSnap = null;
    penPts = [];
    shapesAtDrawStart = [];
  }

  function onMouseleave() {
    hoveredIdx.value = null;
    if (dragging) onMouseup();
  }

  // ── Keyboard ──────────────────────────────────────────────────────────────────
  function onKeydown(e: KeyboardEvent) {
    // Skip when an input/textarea on the page has focus (e.g. text-tool input)
    const target = e.target as HTMLElement | null;
    const tag    = target?.tagName?.toLowerCase();
    const inField = tag === 'input' || tag === 'textarea' || target?.isContentEditable;

    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
    if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return; }

    if (inField) return;

    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIdx.value !== null) {
      e.preventDefault();
      deleteSelected();
    }
    if (e.key === 'Escape' && selectedIdx.value !== null) {
      selectedIdx.value = null;
      redraw();
    }
  }

  // ── Export ────────────────────────────────────────────────────────────────────
  function exportPng(fallback: string): string {
    // Briefly hide the selection overlay during export
    const sel = selectedIdx.value;
    if (sel !== null) { selectedIdx.value = null; redraw(); }
    const url = canvas.value?.toDataURL('image/png') ?? fallback;
    if (sel !== null) { selectedIdx.value = sel; redraw(); }
    return url;
  }

  return {
    bitmapW,
    bitmapH,
    canUndo,
    canRedo,
    hasSelection,
    cursorForTool,
    pendingText,
    onMousedown,
    onMousemove,
    onMouseup,
    onMouseleave,
    commitText,
    cancelText,
    deleteSelected,
    exportPng,
    undo,
    redo,
  };
}
