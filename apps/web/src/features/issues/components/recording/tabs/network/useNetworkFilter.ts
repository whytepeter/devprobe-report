/**
 * useNetworkFilter
 * ────────────────
 * Narrows the timeline event stream down to the Network tab view.
 *
 * Filters (all AND'd):
 *   • kind === 'network'                (always)
 *   • query  → fuzzy substring on summary + URL
 *   • errorsOnly → status === 0 or status ≥ 400
 *   • resource → "All" or a specific resource bucket (Fetch/XHR, Image, …)
 *
 * Resource buckets are inferred from the request URL extension + content-type
 * + the existing `resourceType` (when the page-probe captured it). MIME
 * lookup keeps imports out of this composable.
 */
import { computed, ref, type Ref } from "vue";
import type { TimelineEvent } from "@deveprobe/shared";

export type NetworkResource =
  | "all"
  | "fetch-xhr"  // groups Fetch + XHR (the design's "Fetch/XHR")
  | "xhr"
  | "ws"
  | "script"
  | "css"
  | "image"
  | "doc"
  | "svg"
  | "woff2";

/** Pick a bucket for a network row. Returns "doc" as a safe default. */
function classifyResource(e: TimelineEvent): NetworkResource {
  const data = (e.data ?? {}) as { url?: string; resourceType?: string; contentType?: string };
  const url  = (data.url ?? "").toLowerCase();
  const type = (data.resourceType ?? "").toLowerCase();
  const ct   = (data.contentType ?? "").toLowerCase();

  if (type === "websocket" || url.startsWith("ws://") || url.startsWith("wss://")) return "ws";
  if (type === "xhr")                                                              return "xhr";
  if (type === "fetch" || type === "xmlhttprequest")                               return "fetch-xhr";
  if (url.endsWith(".svg") || ct.includes("image/svg"))                            return "svg";
  if (url.endsWith(".woff2"))                                                      return "woff2";
  if (url.endsWith(".css") || ct.includes("text/css"))                             return "css";
  if (url.endsWith(".js")  || ct.includes("javascript"))                           return "script";
  if (ct.startsWith("image/") || /\.(png|jpe?g|gif|webp|avif|ico)(\?|$)/.test(url)) return "image";
  if (ct.includes("text/html") || url.endsWith(".html"))                           return "doc";
  return "doc";
}

export function useNetworkFilter(events: Ref<TimelineEvent[]>) {
  const query       = ref("");
  const errorsOnly  = ref(false);
  const resource    = ref<NetworkResource>("all");

  const networkOnly = computed(() => events.value.filter((e) => e.kind === "network"));

  const filtered = computed<TimelineEvent[]>(() => {
    const q = query.value.trim().toLowerCase();
    return networkOnly.value.filter((e) => {
      if (errorsOnly.value) {
        const status = (e.data as { status?: number })?.status ?? 0;
        if (!(status === 0 || status >= 400)) return false;
      }
      if (resource.value !== "all") {
        if (classifyResource(e) !== resource.value) return false;
      }
      if (q) {
        const haystack = `${e.summary} ${(e.data as { url?: string })?.url ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  });

  return { query, errorsOnly, resource, filtered, classifyResource };
}
