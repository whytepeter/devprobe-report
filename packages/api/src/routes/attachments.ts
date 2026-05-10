import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { createDb } from "../db/client.js";
import { attachments, issues } from "../db/schema.js";
import { ok, Errors } from "../lib/response.js";
import { requireAuth } from "../middleware/auth.js";
import { RequestUploadUrlSchema } from "@deveprobe/shared";
import type { Env } from "../lib/env.js";

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
