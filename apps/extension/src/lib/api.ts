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

/**
 * A pin row (from the grouped annotation model). Each pin belongs to a
 * session and a grouping issue; the overlay renders these on the page.
 */
export interface AnnotationPinRow {
  id:        string;
  sessionId: string;
  issueId:   string | null;
  index:     number;
  anchor:    Record<string, unknown>;
  comment:   string;
  severity:  "low" | "medium" | "high" | "critical";
  issueType: string;
  status:    string;
  createdAt: string;
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
   * Patch an issue. Used by the annotation overlay's pin-detail popover so a
   * reviewer can change a pin's status inline (which re-colours the marker).
   */
  updateIssue: (id: string, patch: Record<string, unknown>) =>
    send<Issue>({ path: `/issues/${id}`, method: "PATCH", json: patch }),

  // ── Live annotation (GROUPED: session → issue → pins) ────────────────────
  /**
   * Create a pin. Omit sessionId/issueId on the FIRST pin of a sitting — the
   * server lazily creates the session + grouping issue and returns their ids,
   * which the overlay then reuses for every subsequent pin.
   */
  createPin: (input: {
    sessionId?: string;
    issueId?:   string;
    pageUrl:    string;
    anchor:     Record<string, unknown>;
    offsetX:    number;
    offsetY:    number;
    comment:    string;
    severity:   string;
    issueType:  string;
  }) =>
    send<{ pin: AnnotationPinRow; sessionId: string; issueId: string }>({
      path: "/annotation/pins", method: "POST", json: input,
    }),

  /** Update a pin (status / comment / severity / anchor). */
  updatePin: (id: string, patch: Record<string, unknown>) =>
    send<AnnotationPinRow>({ path: `/annotation/pins/${id}`, method: "PATCH", json: patch }),

  /** Delete a pin. */
  deletePin: (id: string) =>
    send<{ deleted: boolean }>({ path: `/annotation/pins/${id}`, method: "DELETE" }),

  /** All pins on a page (across sessions), for the overlay's re-render. */
  getPagePins: (pageUrl: string) =>
    send<AnnotationPinRow[]>({
      path: `/annotation/pins?pageUrl=${encodeURIComponent(pageUrl)}`, method: "GET",
    }),

  /** Finalise a session: set the grouping issue's title (+ optional summary). */
  submitSession: (sessionId: string, title: string, summary?: string) =>
    send<{ submitted: boolean; issueId: string | null }>({
      path: `/annotation/sessions/${sessionId}/submit`, method: "POST",
      json: { title, ...(summary !== undefined && { summary }) },
    }),

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
   * Upload an attachment as a single POST (screenshots / small files).
   * For large recordings prefer `uploadAttachmentMultipart`.
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
    while (true) {
      try {
        params.onPhase?.("uploading");
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

  /**
   * Chunked R2 multipart upload for large recordings.
   *
   * Splits the blob into 5 MiB chunks, routes each through the background SW
   * (to preserve the chrome-extension:// origin), and reports byte-level
   * progress via `onProgress(0–100)`.
   *
   * On any failure the in-progress multipart upload is aborted so R2 doesn't
   * accumulate orphaned parts. The error is re-thrown so the caller can surface
   * it and keep the local draft alive for a manual retry.
   *
   * Phase mapping for the caller's progress label:
   *   initiate → "encoding"  (small, fast)
   *   parts    → "uploading" + onProgress %
   *   complete → "finalising"
   */
  uploadAttachmentMultipart: async (params: {
    blob: Blob;
    filename: string;
    type: "screenshot" | "video" | "thumbnail" | "clip" | "export";
    issueId?: string;
    sessionId?: string;
    chunkSize?: number;   // bytes per part; default 5 MiB (R2 minimum)
    onPhase?: (phase: "encoding" | "uploading" | "finalising") => void;
    onProgress?: (pct: number) => void;
  }): Promise<Attachment> => {
    const CHUNK = params.chunkSize ?? 5 * 1024 * 1024; // 5 MiB

    // ── 1. Initiate ─────────────────────────────────────────────────────────
    params.onPhase?.("encoding");
    const { attachmentId, uploadId } = await send<{
      attachmentId: string;
      uploadId: string;
      r2Key: string;
    }>({
      path: "/attachments/multipart/initiate",
      method: "POST",
      json: {
        type:        params.type,
        filename:    params.filename,
        contentType: params.blob.type || "video/webm",
        sizeBytes:   params.blob.size,
        ...(params.issueId   && { issueId:   params.issueId }),
        ...(params.sessionId && { sessionId: params.sessionId }),
      },
    });

    // ── 2. Upload parts ──────────────────────────────────────────────────────
    params.onPhase?.("uploading");
    const buffer     = await params.blob.arrayBuffer();
    const totalParts = Math.ceil(buffer.byteLength / CHUNK);
    const parts: { partNumber: number; etag: string }[] = [];
    let uploadedBytes = 0;

    try {
      for (let i = 0; i < totalParts; i++) {
        const partNumber = i + 1;
        const start      = i * CHUNK;
        const end        = Math.min(start + CHUNK, buffer.byteLength);
        const chunk      = buffer.slice(start, end);
        const base64     = bufferToBase64(chunk);

        let attempt = 0;
        while (true) {
          try {
            const part = await send<{ partNumber: number; etag: string }>({
              path: "/attachments/multipart/part",
              method: "POST",
              json: { attachmentId, uploadId, partNumber, data: base64 },
            });
            parts.push({ partNumber: part.partNumber, etag: part.etag });
            break;
          } catch (e) {
            if (attempt >= 2) throw e;
            await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
            attempt++;
          }
        }

        uploadedBytes += end - start;
        params.onProgress?.(Math.round((uploadedBytes / buffer.byteLength) * 100));
      }
    } catch (partErr) {
      // Abort the multipart upload so R2 doesn't bill for orphaned parts.
      await send<{ aborted: boolean }>({
        path:   `/attachments/multipart/${attachmentId}`,
        method: "DELETE",
        json:   { uploadId },
      }).catch(() => { /* best effort */ });
      throw partErr;
    }

    // ── 3. Complete ──────────────────────────────────────────────────────────
    params.onPhase?.("finalising");
    const attachment = await send<Attachment>({
      path: "/attachments/multipart/complete",
      method: "POST",
      json: { attachmentId, uploadId, parts, sizeBytes: params.blob.size },
    });

    params.onProgress?.(100);
    return attachment;
  },
};
