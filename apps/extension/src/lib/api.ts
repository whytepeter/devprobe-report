import type { Issue, Attachment } from "@deveprobe/shared";
import { isExtensionAlive } from "./extension.js";

export interface Me {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  orgId: string;
  role: string;
}

/**
 * API client
 * ──────────
 * All requests are proxied through the background service worker via
 * chrome.runtime.sendMessage so calls leave with the extension's
 * chrome-extension:// origin (which the Worker's CORS allows). Content
 * scripts inherit the host page origin which the Worker rejects.
 *
 * Binary payloads go over as base64 strings — Blob/File AND ArrayBuffer
 * both arrive as `{}` on the SW side, so JSON-safe serialisation is the
 * only reliable transport for file uploads.
 */
type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status?: number; error: string };

async function send<T>(msg: Record<string, unknown>): Promise<T> {
  if (!isExtensionAlive()) {
    throw new Error("Extension context invalidated — reload the page.");
  }
  const res = (await chrome.runtime.sendMessage({ type: "API_FETCH", ...msg })) as ApiResult<T> | undefined;
  if (!res) throw new Error("No response from background worker.");
  if (!res.ok) throw new Error(res.error);
  return res.data;
}

/** Encode an ArrayBuffer as base64. Chunked to avoid call-stack overflow on big blobs. */
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK) as unknown as number[]);
  }
  return btoa(binary);
}

/** Recording timeline event sent to /issues/:id/events. */
export interface UploadedTimelineEvent {
  kind:              "console" | "network" | "error" | "user_action" | "performance" | "marker" | "navigation";
  timestampMs:       number;
  startTimestampMs?: number;
  endTimestampMs?:   number;
  severity?:         "critical" | "high" | "medium" | "low";
  summary:           string;
  data?:             Record<string, unknown>;
}

export const api = {
  me: () => send<Me>({ path: "/auth/me", method: "GET" }),

  createIssue: (input: Record<string, unknown>) =>
    send<Issue>({ path: "/issues", method: "POST", json: input }),

  /**
   * Bulk-upload recording timeline events (console, network, errors, user
   * actions, navigations, performance). Chunked to keep each request well
   * under the SW message size limit — large recordings on busy pages can
   * easily produce thousands of events.
   */
  uploadTimelineEvents: async (params: {
    issueId:     string;
    events:      UploadedTimelineEvent[];
    durationMs?: number;
    pageUrl?:    string;
    startedAt?:  string;
    stoppedAt?:  string;
  }) => {
    const CHUNK = 500;
    let total = 0;
    let sessionId: string | undefined;
    for (let i = 0; i < params.events.length; i += CHUNK) {
      const slice = params.events.slice(i, i + CHUNK);
      const res = await send<{ sessionId: string; inserted: number }>({
        path:   `/issues/${params.issueId}/events`,
        method: "POST",
        json: {
          events:     slice,
          // Only attach session metadata on the first batch — backend uses it
          // to create the session row lazily.
          ...(i === 0 && {
            ...(params.durationMs !== undefined && { durationMs: params.durationMs }),
            ...(params.pageUrl    !== undefined && { pageUrl:    params.pageUrl    }),
            ...(params.startedAt  !== undefined && { startedAt:  params.startedAt  }),
            ...(params.stoppedAt  !== undefined && { stoppedAt:  params.stoppedAt  }),
          }),
        },
      });
      sessionId = res.sessionId;
      total += res.inserted;
    }
    return { sessionId, inserted: total };
  },

  /**
   * Upload an attachment with automatic retry-with-backoff.
   *
   * Today this is a single POST through the background worker. The SCREEN_RECORDING_SPEC
   * calls for "resumable or chunked upload" — true R2 multipart support is queued
   * for the Phase 4 backend pass. Until then we at least retry transient failures
   * up to `maxRetries` times before surfacing the error to the user, who can then
   * trigger a manual retry from the saved local draft.
   *
   * @param onPhase Optional callback so the UI can render "Encoding…" → "Uploading…"
   *               → "Finalising…" instead of an opaque spinner.
   */
  uploadAttachment: async (params: {
    blob: Blob;
    filename: string;
    type: "screenshot" | "video" | "thumbnail" | "clip" | "export";
    issueId?: string;
    sessionId?: string;
    maxRetries?: number;
    onPhase?: (phase: "encoding" | "uploading" | "finalising") => void;
  }) => {
    params.onPhase?.("encoding");
    const base64 = bufferToBase64(await params.blob.arrayBuffer());
    const fields: Record<string, string> = { type: params.type };
    if (params.issueId)   fields["issueId"]   = params.issueId;
    if (params.sessionId) fields["sessionId"] = params.sessionId;

    const maxRetries = params.maxRetries ?? 2;
    let attempt = 0;
    // 1s, 2s, 4s exponential backoff between attempts.
    while (true) {
      try {
        params.onPhase?.(attempt === 0 ? "uploading" : "uploading");
        const result = await send<Attachment>({
          path: "/attachments",
          method: "POST",
          file: {
            base64,
            contentType: params.blob.type || "application/octet-stream",
            filename: params.filename,
          },
          fields,
        });
        params.onPhase?.("finalising");
        return result;
      } catch (e) {
        if (attempt >= maxRetries) throw e;
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
        attempt++;
      }
    }
  },
};
