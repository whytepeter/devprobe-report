/**
 * Shared message contract between the MAIN-world page probe and the isolated
 * content script's capture-streams listener.
 *
 * The probe runs as a content script with `world: 'MAIN'` so it can monkey-
 * patch the page's actual `window.fetch` and `XMLHttpRequest`. It posts events
 * via `window.postMessage` (the only channel that crosses the isolated /
 * main world boundary). Both sides import the same constants from this file
 * so the contract stays in one place.
 */
export const PAGE_PROBE_SOURCE = 'devprobe:page-probe' as const;

export type PageProbeEvent =
  | {
      kind:           'network';
      url:            string;        // already URL-redacted by the probe
      method:         string;
      status:         number;
      durationMs:     number;
      ok:             boolean;
      resourceType:   'fetch' | 'xhr';
      contentType?:   string;        // response content-type (powers resource buckets)
      sizeBytes?:     number;        // response size from content-length when present
      graphqlErrors?: string[];      // present when JSON body has top-level `errors`
    }
  | {
      kind:    'console';
      level:   'log' | 'info' | 'warn' | 'error' | 'debug';
      message: string;               // already redacted (numeric PII masked)
      stack?:  string;               // present when an arg was an Error (redacted)
    }
  | {
      kind: 'navigation';
      url:  string;                  // pathname only — query stripped to avoid leaks
      via:  'pushState' | 'replaceState' | 'popstate';
    };

export interface PageProbeMessage {
  source:  typeof PAGE_PROBE_SOURCE;
  event:   PageProbeEvent;
}
