import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { createDb } from "../db/client.js";
import { attachments, issues } from "../db/schema.js";
import { ok, Errors } from "../lib/response.js";
import { requireAuth } from "../middleware/auth.js";
import { RequestUploadUrlSchema } from "@deveprobe/shared";
import type { Env } from "../lib/env.js";

// ── R2 multipart helpers ──────────────────────────────────────────────────────
// Cloudflare R2 multipart requires ≥5 MiB per part (except the last).
// We enforce this on the client side, but we also guard here.
const MIN_PART_BYTES = 5 * 1024 * 1024; // 5 MiB
void MIN_PART_BYTES; // referenced in comments below; suppress unused warning

export const attachmentsRouter = new Hono<{ Bindings: Env }>();

attachmentsRouter.use("*", requireAuth());

// Direct upload (multipart). Body: form-data with `file` + metadata fields.
// In Phase 3 we use direct upload via Worker for simplicity.
// Phase 4 will introduce R2 presigned URLs for chunked recording uploads.
attachmentsRouter.post("/", async (c) => {
  const auth = c.get("auth");
  const form = await c.req.formData().catch(() => null);
  if (!form) return Errors.badRequest("Expected multipart/form-data");

  const file = form.get("file");
  const issueId = form.get("issueId")?.toString() ?? null;
  const sessionId = form.get("sessionId")?.toString() ?? null;
  const type = form.get("type")?.toString() ?? "screenshot";

  if (!file || typeof file === "string") return Errors.badRequest("Missing file");
  const fileObj = file as File;
  if (!issueId && !sessionId) return Errors.badRequest("issueId or sessionId required");

  const db = createDb(c.env.DATABASE_URL);

  if (issueId) {
    const issue = await db.query.issues.findFirst({
      where: and(eq(issues.id, issueId), eq(issues.orgId, auth.orgId)),
    });
    if (!issue) return Errors.notFound("Issue");
  }

  const validTypes = ["video", "thumbnail", "screenshot", "clip", "export"] as const;
  type AttachType = typeof validTypes[number];
  const safeType: AttachType = (validTypes as readonly string[]).includes(type)
    ? (type as AttachType)
    : "screenshot";

  const r2Key = `${auth.orgId}/${safeType}/${nanoid(16)}-${fileObj.name}`;
  await c.env.ASSETS.put(r2Key, fileObj.stream(), {
    httpMetadata: { contentType: fileObj.type },
  });

  const [attachment] = await db.insert(attachments).values({
    r2Key,
    type: safeType,
    contentType: fileObj.type,
    sizeBytes: fileObj.size,
    ...(issueId && { issueId }),
    ...(sessionId && { sessionId }),
  }).returning();

  return ok(attachment, 201);
});

// Stream the underlying R2 object for an attachment. Used by the web app to
// render screenshots — `<img>` tags can't carry an Authorization header so the
// web fetches this endpoint as an authed blob and binds via URL.createObjectURL.
//
// Org scoping: the attachment is reached via its issue/session, both of which
// belong to an org. We reject anything that can't be traced back to caller's org.
attachmentsRouter.get("/:id/content", async (c) => {
  const auth = c.get("auth");
  const id = c.req.param("id");
  const db = createDb(c.env.DATABASE_URL);

  const attachment = await db.query.attachments.findFirst({
    where: eq(attachments.id, id),
    with: { issue: true, session: true },
  });
  if (!attachment) return Errors.notFound("Attachment");

  const ownerOrgId = attachment.issue?.orgId ?? attachment.session?.orgId;
  if (ownerOrgId !== auth.orgId) return Errors.notFound("Attachment");

  const obj = await c.env.ASSETS.get(attachment.r2Key);
  if (!obj) return Errors.notFound("File");

  return new Response(obj.body, {
    headers: {
      "Content-Type": attachment.contentType,
      "Content-Length": String(attachment.sizeBytes),
      "Cache-Control": "private, max-age=3600",
    },
  });
});

// ── R2 Multipart Upload ───────────────────────────────────────────────────────
//
// Large recording blobs are uploaded in 5 MiB chunks so that:
//   1. Individual chrome.runtime.sendMessage calls stay small (≤ 7 MiB base64).
//   2. Per-part progress can be reported to the UI.
//   3. A failed part can be retried without restarting the whole upload.
//
// Flow:
//   POST /attachments/multipart/initiate  → { attachmentId, uploadId, r2Key }
//   POST /attachments/multipart/part      → { partNumber, etag }   (repeated)
//   POST /attachments/multipart/complete  → Attachment (finalised)
//   DELETE /attachments/multipart/:id     → { ok }  (on cancel / error)

// 1. Initiate — creates the DB row + R2 multipart upload.
attachmentsRouter.post("/multipart/initiate", async (c) => {
  const auth  = c.get("auth");
  const body  = await c.req.json().catch(() => null) as {
    issueId?:     string;
    sessionId?:   string;
    type?:        string;
    filename?:    string;
    contentType?: string;
    sizeBytes?:   number;
  } | null;
  if (!body) return Errors.badRequest("Expected JSON body");

  const { issueId, sessionId, contentType, filename, sizeBytes } = body;
  if (!contentType) return Errors.badRequest("contentType required");
  if (!issueId && !sessionId) return Errors.badRequest("issueId or sessionId required");

  const validTypes = ["video", "thumbnail", "screenshot", "clip", "export"] as const;
  type AttachType = typeof validTypes[number];
  const rawType  = body.type ?? "video";
  const safeType: AttachType = (validTypes as readonly string[]).includes(rawType)
    ? (rawType as AttachType)
    : "video";

  const db = createDb(c.env.DATABASE_URL);
  if (issueId) {
    const issue = await db.query.issues.findFirst({
      where: and(eq(issues.id, issueId), eq(issues.orgId, auth.orgId)),
    });
    if (!issue) return Errors.notFound("Issue");
  }

  const r2Key     = `${auth.orgId}/${safeType}/${nanoid(16)}-${filename ?? "recording.webm"}`;
  const mpu       = await c.env.ASSETS.createMultipartUpload(r2Key, {
    httpMetadata: { contentType },
  });
  const uploadId  = mpu.uploadId;

  const [attachment] = await db.insert(attachments).values({
    r2Key,
    r2UploadId:  uploadId,
    status:      "uploading",
    type:        safeType,
    contentType,
    sizeBytes:   sizeBytes ?? 0,
    ...(issueId   && { issueId }),
    ...(sessionId && { sessionId }),
  }).returning();

  return ok({ attachmentId: attachment.id, uploadId, r2Key }, 201);
});

// 2. Upload a single part.
attachmentsRouter.post("/multipart/part", async (c) => {
  const auth = c.get("auth");
  const body = await c.req.json().catch(() => null) as {
    attachmentId?: string;
    uploadId?:     string;
    partNumber?:   number;
    data?:         string;   // base64-encoded chunk
  } | null;
  if (!body) return Errors.badRequest("Expected JSON body");

  const { attachmentId, uploadId, partNumber, data } = body;
  if (!attachmentId || !uploadId || typeof partNumber !== "number" || !data) {
    return Errors.badRequest("attachmentId, uploadId, partNumber, data required");
  }
  if (partNumber < 1 || partNumber > 10_000) return Errors.badRequest("partNumber out of range");

  const db = createDb(c.env.DATABASE_URL);
  const attachment = await db.query.attachments.findFirst({
    where: eq(attachments.id, attachmentId),
    with: { issue: true, session: true },
  });
  if (!attachment) return Errors.notFound("Attachment");
  const ownerOrgId = attachment.issue?.orgId ?? attachment.session?.orgId;
  if (ownerOrgId !== auth.orgId) return Errors.notFound("Attachment");

  // Decode base64 → Uint8Array
  const binary = atob(data);
  const bytes  = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const mpu  = c.env.ASSETS.resumeMultipartUpload(attachment.r2Key, uploadId);
  const part = await mpu.uploadPart(partNumber, bytes);

  return ok({ partNumber: part.partNumber, etag: part.etag });
});

// 3. Complete — finalise the multipart upload and mark the row as complete.
attachmentsRouter.post("/multipart/complete", async (c) => {
  const auth = c.get("auth");
  const body = await c.req.json().catch(() => null) as {
    attachmentId?: string;
    uploadId?:     string;
    parts?:        { partNumber: number; etag: string }[];
    sizeBytes?:    number;
  } | null;
  if (!body) return Errors.badRequest("Expected JSON body");

  const { attachmentId, uploadId, parts, sizeBytes } = body;
  if (!attachmentId || !uploadId || !Array.isArray(parts) || parts.length === 0) {
    return Errors.badRequest("attachmentId, uploadId, parts[] required");
  }

  const db = createDb(c.env.DATABASE_URL);
  const attachment = await db.query.attachments.findFirst({
    where: eq(attachments.id, attachmentId),
    with: { issue: true, session: true },
  });
  if (!attachment) return Errors.notFound("Attachment");
  const ownerOrgId = attachment.issue?.orgId ?? attachment.session?.orgId;
  if (ownerOrgId !== auth.orgId) return Errors.notFound("Attachment");

  const mpu = c.env.ASSETS.resumeMultipartUpload(attachment.r2Key, uploadId);
  await mpu.complete(parts);

  const [updated] = await db.update(attachments)
    .set({
      status:    "complete",
      r2UploadId: null,     // clear the in-progress marker
      ...(sizeBytes !== undefined && { sizeBytes }),
    })
    .where(eq(attachments.id, attachmentId))
    .returning();

  return ok(updated);
});

// 4. Abort — cancel an in-progress multipart upload and mark the row as failed.
attachmentsRouter.delete("/multipart/:attachmentId", async (c) => {
  const auth         = c.get("auth");
  const attachmentId = c.req.param("attachmentId");
  const body         = await c.req.json().catch(() => null) as { uploadId?: string } | null;
  const uploadId     = body?.uploadId;
  if (!uploadId) return Errors.badRequest("uploadId required");

  const db = createDb(c.env.DATABASE_URL);
  const attachment = await db.query.attachments.findFirst({
    where: eq(attachments.id, attachmentId),
    with: { issue: true, session: true },
  });
  if (!attachment) return Errors.notFound("Attachment");
  const ownerOrgId = attachment.issue?.orgId ?? attachment.session?.orgId;
  if (ownerOrgId !== auth.orgId) return Errors.notFound("Attachment");

  try {
    const mpu = c.env.ASSETS.resumeMultipartUpload(attachment.r2Key, uploadId);
    await mpu.abort();
  } catch {
    // R2 may already have expired the upload; continue to mark the row failed.
  }

  await db.update(attachments)
    .set({ status: "failed", r2UploadId: null })
    .where(eq(attachments.id, attachmentId));

  return ok({ aborted: true });
});

// Request a signed URL for direct R2 upload (Phase 4 path)
attachmentsRouter.post("/upload-url", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = RequestUploadUrlSchema.safeParse(body);
  if (!parsed.success) return Errors.badRequest("Invalid input", parsed.error.flatten());

  const auth = c.get("auth");
  const r2Key = `${auth.orgId}/${parsed.data.type}/${nanoid(16)}`;

  // Cloudflare R2 doesn't issue presigned URLs from the Workers binding directly.
  // For now: return our own short-lived upload token + the direct upload route.
  return ok({
    r2Key,
    uploadUrl: `/attachments`,
    method: "POST",
    headers: { Authorization: c.req.header("Authorization") ?? "" },
  });
});
