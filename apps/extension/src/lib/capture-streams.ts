/**
 * Capture streams during a screen recording.
 *
 * Captures EVERY observable event (per SCREEN_RECORDING_SPEC) so the issue
 * details page can render correlated panels:
 *   - Console (log / info / warn / error / debug) — via page-probe MAIN world
 *   - Network (all requests, with redacted URLs, GraphQL error detection)
 *   - JS errors + unhandled rejections
 *   - User actions (clicks, with privacy-safe labels)
 *   - Navigations (popstate + pushState/replaceState via page-probe)
 *
 * `stop()` returns two arrays:
 *   - events  → the FULL event stream (uploaded to the API and rendered as
 *                correlated panels on /issue/[id] — console, network,
 *                user actions, navigations, errors, etc. ALL included.)
 *   - markers → the subset shown as dots on the recording-compose trimmer.
 *               Only `error` and `warning` types are pushed here.
 *
 * Display rule:
 *   • Trimmer markers   → errors + warnings only (console + network).
 *     Network failures → 'error'.  Slow requests → 'warning'.
 *   • Issue page panels → everything that's stored in `events`.
 *
 * All events share a single timebase: `performance.now() - startedAt`.
 */
import type { RecordingMarker, MarkerType } from '../components/capture/recording/types.js';
import type { UploadedTimelineEvent } from './api.js';
import { PAGE_PROBE_SOURCE, type PageProbeMessage } from './page-probe-payload.js';
import { redactClickTarget, redactUrl } from './redact.js';

const SLOW_REQUEST_MS = 1000;

export interface CaptureStreams {
  /** Stop all observers. Returns markers + full event stream. */
  stop: () => { markers: RecordingMarker[]; events: UploadedTimelineEvent[] };
}

export function startCaptureStreams(startedAtEpoch: number): CaptureStreams {
  const markers: RecordingMarker[] = [];
  const events:  UploadedTimelineEvent[] = [];
  let n = 0;

  const tsMs = () => Math.max(0, Date.now() - startedAtEpoch);

  /** Push to the trimmer's marker view (warnings + errors only). */
  const pushMarker = (type: MarkerType, label?: string) =>
    markers.push({ id: `m-${++n}`, timestampMs: tsMs(), type, label });

  /** Push to the full event stream (sent to the API + issue page). */
  const pushEvent = (event: Omit<UploadedTimelineEvent, 'timestampMs'>) =>
    events.push({ ...event, timestampMs: tsMs() });

  // ── window.error ──────────────────────────────────────────────────────────
  const onError = (e: ErrorEvent) => {
    const msg = e.message || 'Uncaught error';
    pushMarker('error', msg);
    pushEvent({
      kind: 'error',
      severity: 'high',
      summary: msg,
      data: {
        source: e.filename,
        line:   e.lineno,
        col:    e.colno,
        type:   e.error?.name ?? 'Error',
        ...(e.error?.stack && { stack: String(e.error.stack).slice(0, 2000) }),
      },
    });
  };
  window.addEventListener('error', onError, true);

  // ── unhandledrejection ────────────────────────────────────────────────────
  const onRejection = (e: PromiseRejectionEvent) => {
    const isErr  = e.reason instanceof Error;
    const reason = isErr ? (e.reason as Error).message : String(e.reason);
    const msg = `Unhandled rejection: ${reason}`;
    pushMarker('error', msg);
    pushEvent({
      kind: 'error',
      severity: 'high',
      summary: msg,
      data: {
        type: isErr ? (e.reason as Error).name : 'UnhandledRejection',
        ...(isErr && (e.reason as Error).stack && { stack: String((e.reason as Error).stack).slice(0, 2000) }),
      },
    });
  };
  window.addEventListener('unhandledrejection', onRejection);

  // ── User actions ──────────────────────────────────────────────────────────
  // Saved but NOT shown on the trimmer (per user direction). Labels are
  // produced by the redaction helper, which masks password/payment fields and
  // never captures input VALUES — only the field's role/label.
  //
  // Summaries use the verb prefixes the web ActionRow glyph map expects
  // (Clicked / Typed / Focused / Scrolled / Submitted).

  // Clicks.
  const onClick = (e: MouseEvent) => {
    const t = e.target as Element | null;
    if (!t) return;
    pushEvent({
      kind: 'user_action',
      summary: `Clicked ${redactClickTarget(t)}`,
      data: { action: 'click', tag: t.tagName.toLowerCase(), x: e.clientX, y: e.clientY },
    });
  };
  document.addEventListener('click', onClick, true);

  // Typing / value changes. `change` fires once per committed edit (blur or
  // Enter for text inputs; immediately for select/checkbox), so it's one
  // high-signal row per field — never the raw value.
  const onChange = (e: Event) => {
    const t = e.target as Element | null;
    if (!t) return;
    const tag  = t.tagName.toLowerCase();
    const verb = tag === 'select' || (t as HTMLInputElement).type === 'checkbox' || (t as HTMLInputElement).type === 'radio'
      ? 'Changed' : 'Typed in';
    pushEvent({
      kind: 'user_action',
      summary: `${verb} ${redactClickTarget(t)}`,
      data: { action: 'change', tag },
    });
  };
  document.addEventListener('change', onChange, true);

  // Form submissions.
  const onSubmit = (e: Event) => {
    const t = e.target as Element | null;
    if (!t) return;
    pushEvent({
      kind: 'user_action',
      summary: `Submitted ${redactClickTarget(t)}`,
      data: { action: 'submit', tag: t.tagName.toLowerCase() },
    });
  };
  document.addEventListener('submit', onSubmit, true);

  // Scroll depth milestones — emit each 25% threshold once, rAF-throttled so a
  // fast scroll doesn't flood the stream.
  const seenScrollPct = new Set<number>();
  let scrollRafPending = false;
  const onScroll = () => {
    if (scrollRafPending) return;
    scrollRafPending = true;
    requestAnimationFrame(() => {
      scrollRafPending = false;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      const pct = Math.min(100, Math.round((window.scrollY / max) * 100));
      const milestone = Math.floor(pct / 25) * 25;   // 0,25,50,75,100
      if (milestone <= 0 || seenScrollPct.has(milestone)) return;
      seenScrollPct.add(milestone);
      pushEvent({
        kind: 'user_action',
        summary: `Scrolled to ${milestone}%`,
        data: { action: 'scroll', depthPct: milestone },
      });
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  // ── Navigations (popstate; pushState/replaceState come via page-probe) ────
  // Stored for the issue details timeline panels, but NOT marked on the
  // trimmer — only errors/warnings get markers.
  const onPopstate = () => {
    const summary = `Nav: ${location.pathname}`;
    pushEvent({ kind: 'navigation', summary, data: { via: 'popstate' } });
  };
  window.addEventListener('popstate', onPopstate);

  // ── Page probe (network + console + navigations from MAIN world) ──────────
  const onProbe = (e: MessageEvent) => {
    const data = e.data as PageProbeMessage | undefined;
    if (!data || data.source !== PAGE_PROBE_SOURCE) return;
    const ev = data.event;

    if (ev.kind === 'network') {
      const shortUrl = (() => {
        try {
          const u = new URL(ev.url, location.href);
          return u.host + u.pathname;
        } catch { return ev.url; }
      })();

      // Span timebase: the probe posts on completion, so receive-time ≈ end.
      // Derive the start by subtracting the measured duration (clamped ≥ 0).
      const durationMs      = Math.round(ev.durationMs);
      const endTimestampMs  = tsMs();
      const startTimestampMs = Math.max(0, endTimestampMs - durationMs);

      // Always record the request (full network log).
      pushEvent({
        kind: 'network',
        summary: `${ev.method} ${shortUrl} → ${ev.status} (${durationMs}ms)`,
        severity: ev.graphqlErrors?.length || ev.status >= 500 ? 'high'
                : ev.status >= 400                              ? 'medium'
                : ev.durationMs > SLOW_REQUEST_MS               ? 'low'
                : undefined,
        startTimestampMs,
        endTimestampMs,
        data: {
          url: redactUrl(ev.url),
          method: ev.method,
          status: ev.status,
          durationMs,
          ok: ev.ok,
          resourceType: ev.resourceType,
          ...(ev.contentType && { contentType: ev.contentType }),
          ...(Number.isFinite(ev.sizeBytes) && { sizeBytes: ev.sizeBytes }),
          ...(ev.graphqlErrors?.length && { graphqlErrors: ev.graphqlErrors }),
        },
      });

      // Marker view: collapse network signals into the two user-facing tiers:
      //   • failures (status≥400 / network error / GraphQL errors) → 'error'
      //   • slow requests                                          → 'warning'
      if (ev.graphqlErrors?.length) {
        for (const msg of ev.graphqlErrors) pushMarker('error', `GraphQL: ${msg}`);
      } else if (ev.status >= 400 || (!ev.ok && ev.status === 0)) {
        pushMarker('error', `${ev.method} ${shortUrl} → ${ev.status || 'network error'}`);
      } else if (ev.durationMs > SLOW_REQUEST_MS) {
        pushMarker('warning', `${ev.method} ${shortUrl} (${Math.round(ev.durationMs)}ms)`);
      }
      return;
    }

    if (ev.kind === 'console') {
      pushEvent({
        kind: 'console',
        summary: ev.message,
        severity: ev.level === 'error' ? 'high'
                : ev.level === 'warn'  ? 'medium'
                : undefined,
        data: { level: ev.level, ...(ev.stack && { stack: ev.stack }) },
      });
      if (ev.level === 'error')      pushMarker('error',   `Console error: ${ev.message.slice(0, 80)}`);
      else if (ev.level === 'warn')  pushMarker('warning', `Console warn: ${ev.message.slice(0, 80)}`);
      return;
    }

    if (ev.kind === 'navigation') {
      // Stored only — no trimmer marker (errors/warnings only on the timeline).
      const summary = `Nav: ${ev.url}`;
      pushEvent({ kind: 'navigation', summary, data: { via: ev.via } });
      return;
    }
  };
  window.addEventListener('message', onProbe);

  return {
    stop() {
      window.removeEventListener('error',              onError, true);
      window.removeEventListener('unhandledrejection', onRejection);
      document.removeEventListener('click',            onClick, true);
      document.removeEventListener('change',           onChange, true);
      document.removeEventListener('submit',           onSubmit, true);
      window.removeEventListener('scroll',             onScroll);
      window.removeEventListener('popstate',           onPopstate);
      window.removeEventListener('message',            onProbe);
      return { markers, events };
    },
  };
}
