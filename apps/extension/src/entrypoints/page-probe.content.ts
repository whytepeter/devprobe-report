/**
 * Page probe — MAIN-world content script.
 *
 * Runs at document_start in the page's main JS world so it can intercept
 * the application's actual `window.fetch`, `XMLHttpRequest`, `console.*`,
 * and history API. The isolated content script can't observe these on its
 * own — its globals are a separate binding from the page's.
 *
 * Every event we post is REDACTED before leaving the page (per
 * SCREEN_RECORDING_SPEC.md → "Redaction before upload"):
 *   - URLs: sensitive query params (token, key, password…) → [redacted]
 *   - Navigations: pathname only (search stripped entirely)
 *   - Console args: numeric PII (credit-card-shaped digits) masked, objects
 *     not deep-stringified
 *   - Request / response bodies: never posted
 *   - Headers: never posted
 */
import { PAGE_PROBE_SOURCE, type PageProbeMessage } from '../lib/page-probe-payload.js';

// ── Inline minimal redaction (page-probe runs in main world; cannot import
// from outside its own bundle). Kept narrow + in-sync with /lib/redact.ts. ──
const SENSITIVE_QUERY_PARAMS = new Set<string>([
  'token', 'access_token', 'refresh_token', 'id_token',
  'apikey', 'api_key', 'key', 'secret', 'client_secret',
  'password', 'passwd', 'pwd',
  'auth', 'authorization', 'session', 'sessionid', 'sid',
  'code', 'oauth_token', 'oauth_verifier',
  'signature', 'sig',
]);
const REDACTED = '[redacted]';

function redactUrl(input: string): string {
  try {
    const u = new URL(input, location.href);
    const params = new URLSearchParams();
    for (const [k, v] of u.searchParams) {
      params.set(k, SENSITIVE_QUERY_PARAMS.has(k.toLowerCase()) ? REDACTED : v);
    }
    u.search = params.toString() ? `?${params.toString()}` : '';
    u.hash = '';   // strip fragments (OAuth implicit tokens often live here)
    return u.toString();
  } catch { return input; }
}

function redactNumericPII(s: string): string {
  return s.replace(/\b(?:\d[ -]?){13,19}\b/g, REDACTED);
}

function redactConsoleArg(arg: unknown): string {
  if (arg == null) return String(arg);
  if (typeof arg === 'string')  return redactNumericPII(arg.slice(0, 200));
  if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg);
  if (arg instanceof Error)     return `${arg.name}: ${redactNumericPII(arg.message)}`;
  if (typeof arg === 'object')  return `[${(arg as object).constructor?.name ?? 'object'}]`;
  return String(arg).slice(0, 200);
}

export default defineContentScript({
  // Registered AT RUNTIME by the background SW when a recording starts —
  // NOT auto-injected. Without this, `console.error` would be wrapped on
  // every site the user visits (privacy violation + makes us appear in
  // every site's error stack traces, e.g. next-auth's CLIENT_FETCH_ERROR).
  //
  // The cost of lazy injection: console/network calls made BEFORE the
  // recording starts on this page aren't captured. That's the desired
  // behaviour — recording timeline starts at recording-start, not page-load.
  registration: 'runtime',
  matches: ['<all_urls>'],
  runAt:   'document_start',
  world:   'MAIN',
  main() {
    const post = (event: PageProbeMessage['event']) => {
      try {
        window.postMessage(
          { source: PAGE_PROBE_SOURCE, event } satisfies PageProbeMessage,
          '*',
        );
      } catch { /* swallow */ }
    };

    // ── fetch ───────────────────────────────────────────────────────────────
    const origFetch = window.fetch;
    if (typeof origFetch === 'function') {
      window.fetch = async function (input, init) {
        const startMs = performance.now();
        const rawUrl =
          typeof input === 'string'
            ? input
            : input instanceof URL
            ? input.href
            : (input as Request).url;
        const url    = redactUrl(rawUrl);
        const method = (init?.method || (input as Request).method || 'GET').toUpperCase();

        let res: Response;
        try {
          res = await origFetch.call(this, input as RequestInfo, init);
        } catch (e) {
          post({
            kind:         'network',
            url,
            method,
            status:       0,
            durationMs:   performance.now() - startMs,
            ok:           false,
            resourceType: 'fetch',
          });
          throw e;
        }

        const durationMs    = performance.now() - startMs;
        const graphqlErrors = await detectGraphqlErrors(res);
        const contentType   = res.headers.get('content-type') || undefined;
        const lenHeader     = res.headers.get('content-length');
        const sizeBytes     = lenHeader != null && Number.isFinite(+lenHeader) ? +lenHeader : undefined;

        post({
          kind:         'network',
          url,
          method,
          status:       res.status,
          durationMs,
          ok:           res.ok,
          resourceType: 'fetch',
          contentType,
          sizeBytes,
          graphqlErrors,
        });

        return res;
      };
    }

    async function detectGraphqlErrors(res: Response): Promise<string[] | undefined> {
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json') && !ct.includes('application/graphql')) return;
      try {
        const body = await res.clone().json();
        const errs = Array.isArray(body?.errors) ? body.errors : null;
        if (!errs || errs.length === 0) return;
        return errs
          .map((e: unknown) => {
            if (typeof e === 'string') return redactNumericPII(e);
            if (e && typeof e === 'object' && 'message' in e) return redactNumericPII(String((e as { message: unknown }).message));
            return '[graphql error]';
          })
          .filter(Boolean) as string[];
      } catch {
        return;
      }
    }

    // ── XMLHttpRequest ──────────────────────────────────────────────────────
    const OrigXHR = window.XMLHttpRequest;
    if (typeof OrigXHR === 'function') {
      interface XHRMeta { method: string; url: string; startMs: number }
      const metaMap = new WeakMap<XMLHttpRequest, XHRMeta>();

      const origOpen = OrigXHR.prototype.open;
      OrigXHR.prototype.open = function (
        method: string,
        url: string | URL,
      ): void {
        metaMap.set(this, {
          method:  String(method || 'GET').toUpperCase(),
          url:     redactUrl(url instanceof URL ? url.href : String(url)),
          startMs: 0,
        });
        // eslint-disable-next-line prefer-rest-params, @typescript-eslint/no-explicit-any
        return origOpen.apply(this, arguments as any);
      };

      const origSend = OrigXHR.prototype.send;
      OrigXHR.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
        const meta = metaMap.get(this);
        if (meta) meta.startMs = performance.now();
        this.addEventListener('loadend', () => {
          if (!meta) return;
          const durationMs = performance.now() - meta.startMs;
          let graphqlErrors: string[] | undefined;
          const ct = this.getResponseHeader('content-type') || '';
          if (ct.includes('application/json') || ct.includes('application/graphql')) {
            try {
              const parsed = JSON.parse(this.responseText);
              if (Array.isArray(parsed?.errors) && parsed.errors.length) {
                graphqlErrors = parsed.errors.map((e: { message?: string } | string) =>
                  typeof e === 'string' ? redactNumericPII(e) : redactNumericPII(e?.message ?? '[graphql error]'),
                );
              }
            } catch { /* not JSON */ }
          }
          const lenHeader = this.getResponseHeader('content-length');
          const sizeBytes = lenHeader != null && Number.isFinite(+lenHeader) ? +lenHeader : undefined;
          post({
            kind:         'network',
            url:          meta.url,
            method:       meta.method,
            status:       this.status,
            durationMs,
            ok:           this.status >= 200 && this.status < 400,
            resourceType: 'xhr',
            contentType:  ct || undefined,
            sizeBytes,
            graphqlErrors,
          });
        }, { once: true });
        return origSend.call(this, body);
      };
    }

    // ── console ─────────────────────────────────────────────────────────────
    const levels = ['log', 'info', 'warn', 'error', 'debug'] as const;
    for (const level of levels) {
      const orig = console[level];
      if (typeof orig !== 'function') continue;
      console[level] = function (...args: unknown[]) {
        try {
          const message = args.map(redactConsoleArg).join(' ').slice(0, 500);
          // Capture the stack from the first Error arg (redacted, capped).
          const errArg = args.find((a) => a instanceof Error) as Error | undefined;
          const stack  = errArg?.stack ? redactNumericPII(errArg.stack).slice(0, 2000) : undefined;
          post({ kind: 'console', level, message, stack });
        } catch { /* never break the page's logging */ }
        return orig.apply(this, args);
      };
    }

    // ── history.pushState / replaceState / popstate ─────────────────────────
    const sendNav = (via: 'pushState' | 'replaceState' | 'popstate') => {
      // Pathname only — strip query + hash to avoid leaking tokens.
      try {
        const path = location.pathname;
        post({ kind: 'navigation', url: path, via });
      } catch { /* swallow */ }
    };

    const origPush = history.pushState;
    history.pushState = function (...args) {
      // eslint-disable-next-line prefer-spread, @typescript-eslint/no-explicit-any
      const r = origPush.apply(this, args as any);
      sendNav('pushState');
      return r;
    };
    const origReplace = history.replaceState;
    history.replaceState = function (...args) {
      // eslint-disable-next-line prefer-spread, @typescript-eslint/no-explicit-any
      const r = origReplace.apply(this, args as any);
      sendNav('replaceState');
      return r;
    };
    window.addEventListener('popstate', () => sendNav('popstate'));
  },
});
