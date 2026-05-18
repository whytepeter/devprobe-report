/**
 * Redaction helpers — privacy-first per SCREEN_RECORDING_SPEC.md.
 *
 * The spec mandates redaction BEFORE upload (not at the server). Every
 * timeline event passes through these helpers in the capture pipeline so the
 * recording payload never contains:
 *   - Cookies, Authorization headers, tokens, API keys
 *   - Password, payment, or other sensitive form values
 *   - URL query parameters that commonly carry secrets
 *   - Stringified objects with credit-card-shaped numbers
 *
 * Live denylists/allowlists (project-level network capture rules) are TODO.
 * For now we ship a sensible built-in default that handles the most common
 * leaks. Anything captured deeper (request/response bodies) is OUT of scope
 * for v1 — we deliberately don't capture them.
 */

/** Query-param names that commonly carry secrets. Case-insensitive. */
const SENSITIVE_QUERY_PARAMS = new Set<string>([
  'token', 'access_token', 'refresh_token', 'id_token',
  'apikey', 'api_key', 'key', 'secret', 'client_secret',
  'password', 'passwd', 'pwd',
  'auth', 'authorization', 'session', 'sessionid', 'sid',
  'code', 'oauth_token', 'oauth_verifier',
  'signature', 'sig',
]);

const REDACTED = '[redacted]';

/** Strip sensitive params from a URL's query string. Pathname is preserved. */
export function redactUrl(input: string, baseHref: string = (typeof location !== 'undefined' ? location.href : '')): string {
  try {
    const u = new URL(input, baseHref || undefined);
    const params = new URLSearchParams();
    for (const [k, v] of u.searchParams) {
      params.set(k, SENSITIVE_QUERY_PARAMS.has(k.toLowerCase()) ? REDACTED : v);
    }
    u.search = params.toString() ? `?${params.toString()}` : '';
    // Drop fragments — they sometimes carry tokens (OAuth implicit flows).
    u.hash = '';
    return u.toString();
  } catch {
    return input;
  }
}

/** Replace likely credit-card-shaped numbers with [redacted]. */
export function redactNumericPII(s: string): string {
  // 13-19 digit runs (with optional spaces/dashes) — credit cards, IBANs.
  return s.replace(/\b(?:\d[ -]?){13,19}\b/g, REDACTED);
}

/**
 * Build a privacy-safe label for a clicked element.
 * Strategy:
 *   - Password inputs               → "[password field]"
 *   - Inputs flagged as sensitive   → element role + redacted value
 *   - Otherwise prefer aria-label / data-testid / role / tag
 *   - textContent is allowed but capped to 60 chars and only for non-input nodes
 */
export function redactClickTarget(el: Element): string {
  if (!(el instanceof HTMLElement)) return el.tagName?.toLowerCase() || 'unknown';

  const tag = el.tagName.toLowerCase();

  // Form inputs: never capture the value, only the field role.
  if (el instanceof HTMLInputElement) {
    const type = (el.type || 'text').toLowerCase();
    if (type === 'password') return '[password field]';
    if (/cc|card|cvv|cvc|security/.test(el.name || '') || /cc|card|cvv|cvc/.test(el.autocomplete || '')) {
      return '[payment field]';
    }
    const label = el.getAttribute('aria-label') || el.name || el.placeholder || type;
    return `input[${label.slice(0, 40)}]`;
  }
  if (el instanceof HTMLTextAreaElement) {
    return `textarea[${(el.getAttribute('aria-label') || el.name || el.placeholder || '').slice(0, 40)}]`;
  }
  if (el instanceof HTMLSelectElement) {
    return `select[${(el.getAttribute('aria-label') || el.name || '').slice(0, 40)}]`;
  }
  if (el.isContentEditable) return '[editable field]';

  // Prefer accessible labels for everything else.
  const aria   = el.getAttribute('aria-label');
  const testid = el.getAttribute('data-testid');
  if (aria)   return `${tag}: ${aria.slice(0, 60)}`;
  if (testid) return `${tag}#${testid.slice(0, 60)}`;

  const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
  if (text)   return `${tag}: ${redactNumericPII(text.slice(0, 60))}`;
  return tag;
}

/** Safe coercion for a console arg → short string (no deep object dump). */
export function redactConsoleArg(arg: unknown): string {
  if (arg == null) return String(arg);
  if (typeof arg === 'string')  return redactNumericPII(arg.slice(0, 200));
  if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg);
  if (arg instanceof Error)     return `${arg.name}: ${redactNumericPII(arg.message)}`;
  if (typeof arg === 'object')  return `[${(arg as object).constructor?.name ?? 'object'}]`;
  return String(arg).slice(0, 200);
}
