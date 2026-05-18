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
 *   - events  → the full event stream (uploaded to the API)
 *   - markers → the subset shown as warning/error dots on the trimmer
 *
 * Display rule (per the user): only console.warn / console.error / errors /
 * network failures / slow requests / GraphQL errors appear on the trimmer.
 * Everything else is saved but not visualised in the compose modal.
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

export function startCaptureStreams(startedAt: number): CaptureStreams {
  const markers: RecordingMarker[] = [];
  const events:  UploadedTimelineEvent[] = [];
  let n = 0;

  const tsMs = () => Math.round(performance.now() - startedAt);

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
      data: { source: e.filename, line: e.lineno, col: e.colno },
    });
  };
  window.addEventListener('error', onError, true);

  // ── unhandledrejection ────────────────────────────────────────────────────
  const onRejection = (e: PromiseRejectionEvent) => {
    const reason = e.reason instanceof Error ? e.reason.message : String(e.reason);
    const msg = `Unhandled rejection: ${reason}`;
    pushMarker('error', msg);
    pushEvent({ kind: 'error', severity: 'high', summary: msg });
  };
  window.addEventListener('unhandledrejection', onRejection);

  // ── User clicks ──────────────────────────────────────────────────────────
  // Saved but NOT shown on the trimmer (per user direction). Click labels
  // are produced by the redaction helper, which masks password/payment
  // fields and never captures input values.
  const onClick = (e: MouseEvent) => {
    const t = e.target as Element | null;
    if (!t) return;
    pushEvent({
      kind: 'user_action',
      summary: `Click: ${redactClickTarget(t)}`,
      data: { tag: t.tagName.toLowerCase(), x: e.clientX, y: e.clientY },
    });
  };
  document.addEventListener('click', onClick, true);

  // ── Navigations (popstate; pushState/replaceState come via page-probe) ────
  const onPopstate = () => {
    const summary = `Nav: ${location.pathname}`;
    pushMarker('navigation', summary);
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

      // Always record the request (full network log).
      pushEvent({
        kind: 'network',
        summary: `${ev.method} ${shortUrl} → ${ev.status} (${Math.round(ev.durationMs)}ms)`,
        severity: ev.graphqlErrors?.length || ev.status >= 500 ? 'high'
                : ev.status >= 400                              ? 'medium'
                : ev.durationMs > SLOW_REQUEST_MS               ? 'low'
                : undefined,
        data: {
          url: redactUrl(ev.url),
          method: ev.method,
          status: ev.status,
          durationMs: Math.round(ev.durationMs),
          ok: ev.ok,
          ...(ev.graphqlErrors?.length && { graphqlErrors: ev.graphqlErrors }),
        },
      });

      // Marker view: only warnings / errors / slow.
      if (ev.graphqlErrors?.length) {
        for (const msg of ev.graphqlErrors) pushMarker('error', `GraphQL: ${msg}`);
      } else if (ev.status >= 400 || (!ev.ok && ev.status === 0)) {
        pushMarker('network_fail', `${ev.method} ${shortUrl} → ${ev.status || 'network error'}`);
      } else if (ev.durationMs > SLOW_REQUEST_MS) {
        pushMarker('network_slow', `${ev.method} ${shortUrl} (${Math.round(ev.durationMs)}ms)`);
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
        data: { level: ev.level },
      });
      if (ev.level === 'error')      pushMarker('error',   `Console error: ${ev.message.slice(0, 80)}`);
      else if (ev.level === 'warn')  pushMarker('warning', `Console warn: ${ev.message.slice(0, 80)}`);
      return;
    }

    if (ev.kind === 'navigation') {
      const summary = `Nav: ${ev.url}`;
      pushMarker('navigation', summary);
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
      window.removeEventListener('popstate',           onPopstate);
      window.removeEventListener('message',            onProbe);
      return { markers, events };
    },
  };
}
