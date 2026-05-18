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

export const api = {
  me: () => send<Me>({ path: "/auth/me", method: "GET" }),

  createIssue: (input: Record<string, unknown>) =>
    send<Issue>({ path: "/issues", method: "POST", json: input }),

  uploadAttachment: async (params: {
    blob: Blob;
    filename: string;
    type: "screenshot" | "video" | "thumbnail" | "clip" | "export";
    issueId?: string;
    sessionId?: string;
  }) => {
    const base64 = bufferToBase64(await params.blob.arrayBuffer());
    const fields: Record<string, string> = { type: params.type };
    if (params.issueId)   fields["issueId"]   = params.issueId;
    if (params.sessionId) fields["sessionId"] = params.sessionId;
    return send<Attachment>({
      path: "/attachments",
      method: "POST",
      file: {
        base64,
        contentType: params.blob.type || "application/octet-stream",
        filename: params.filename,
      },
      fields,
    });
  },
};
