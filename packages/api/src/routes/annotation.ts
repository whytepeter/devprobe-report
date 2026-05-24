import { Hono } from "hono";
import { eq, and, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { createDb } from "../db/client.js";
import { annotationSessions, pins, issues } from "../db/schema.js";
import { ok, Errors } from "../lib/response.js";
import { requireAuth } from "../middleware/auth.js";
import type { Env } from "../lib/env.js";

/**
 * Live-annotation API — GROUPED model.
 *
 * A "session" is one review sitting on a page. All pins dropped during that
 * sitting roll up into ONE issue (mode = live_annotation). This keeps the
 * dashboard clean: a 20-pin design review is a single issue with 20 child
 * pins, not 20 issues.
 *
 *   annotation_session  (1 per sitting)
 *      └── issue         (1, the dashboard-visible container)
 *           └── pins[]   (each: comment, severity, type, status, anchor)
 *
 * Persistence is LIVE: the session + issue are created lazily on the FIRST
 * pin, and every subsequent pin saves immediately, so a review survives a
 * tab close mid-way. The issue title is a placeholder until the reviewer
 * finishes and submits a real one.
 */
export const annotationRouter = new Hono<{ Bindings: Env }>();

annotationRouter.use("*", requireAuth());

const AnchorSchema = z.record(z.unknown()); // PinAnchor blob — validated client-side

const CreatePinSchema = z.object({
  // Omit session/issue on the FIRST pin → server creates them.
  sessionId:  z.string().uuid().optional(),
  issueId:    z.string().uuid().optional(),
  pageUrl:    z.string().url(),
  anchor:     AnchorSchema,
  offsetX:    z.number(),
  offsetY:    z.number(),
  comment:    z.string().min(1).max(2000),
  severity:   z.enum(["low", "medium", "high", "critical"]).default("medium"),
  issueType:  z.enum([
    "visual_bug", "layout_issue", "copy_issue", "broken_behavior",
    "missing_element", "accessibility", "performance", "other",
  ]),
  assigneeId: z.string().uuid().nullable().optional(),
  labels:     z.array(z.string().max(50)).max(10).optional(),
});

// ── POST /annotation/pins ────────────────────────────────────────────────────
// Create a pin. Lazily creates the session + grouping issue on the first pin.
annotationRouter.post("/pins", async (c) => {
  const auth = c.get("auth");
  const body = await c.req.json().catch(() => null);
  const parsed = CreatePinSchema.safeParse(body);
  if (!parsed.success) return Errors.badRequest("Invalid input", parsed.error.flatten());

  const db = createDb(c.env.DATABASE_URL);
  const d  = parsed.data;

  let sessionId = d.sessionId;
  let issueId   = d.issueId;

  // First pin → spin up the session + the grouping issue.
  if (!sessionId || !issueId) {
    let urlPath = "/";
    try { urlPath = new URL(d.pageUrl).pathname; } catch { /* keep default */ }

    const [session] = await db.insert(annotationSessions).values({
      orgId:       auth.orgId,
      createdById: auth.userId,
      pageUrl:     d.pageUrl,
      urlPath,
      status:      "draft",
      pinCount:    0,
    }).returning();

    const host = (() => { try { return new URL(d.pageUrl).host; } catch { return d.pageUrl; } })();
    const [issue] = await db.insert(issues).values({
      orgId:       auth.orgId,
      createdById: auth.userId,
      source:      "extension",
      mode:        "live_annotation",
      // Placeholder — replaced when the reviewer submits a real title.
      title:       `Annotation review · ${host}${urlPath === "/" ? "" : urlPath}`,
      severity:    d.severity,
      pageUrl:     d.pageUrl,
    }).returning();

    sessionId = session!.id;
    issueId   = issue!.id;
  } else {
    // Verify the provided session belongs to this org.
    const session = await db.query.annotationSessions.findFirst({
      where: and(eq(annotationSessions.id, sessionId), eq(annotationSessions.orgId, auth.orgId)),
    });
    if (!session) return Errors.notFound("Session");
  }

  // Next index = current pin count for the session.
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(pins)
    .where(eq(pins.sessionId, sessionId));

  const [pin] = await db.insert(pins).values({
    sessionId,
    issueId,
    index:       (count ?? 0) + 1,
    anchor:      d.anchor,
    offsetX:     d.offsetX,
    offsetY:     d.offsetY,
    comment:     d.comment,
    issueType:   d.issueType,
    severity:    d.severity,
    status:      "open",
    createdById: auth.userId,
    ...(d.assigneeId !== undefined && { assigneeId: d.assigneeId }),
    ...(d.labels     !== undefined && { labels:     d.labels     }),
  }).returning();

  // Keep the session's denormalised pin count fresh.
  await db.update(annotationSessions)
    .set({ pinCount: (count ?? 0) + 1, updatedAt: new Date() })
    .where(eq(annotationSessions.id, sessionId));

  return ok({ pin, sessionId, issueId }, 201);
});

// ── PATCH /annotation/pins/:id ───────────────────────────────────────────────
const UpdatePinSchema = z.object({
  comment:   z.string().min(1).max(2000).optional(),
  severity:  z.enum(["low", "medium", "high", "critical"]).optional(),
  status:    z.string().optional(),
  issueType: z.string().optional(),
  anchor:    AnchorSchema.optional(),
  offsetX:   z.number().optional(),
  offsetY:   z.number().optional(),
});

annotationRouter.patch("/pins/:id", async (c) => {
  const auth = c.get("auth");
  const id   = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = UpdatePinSchema.safeParse(body);
  if (!parsed.success) return Errors.badRequest("Invalid input", parsed.error.flatten());

  const db = createDb(c.env.DATABASE_URL);

  // Org check via the pin's session.
  const pin = await db.query.pins.findFirst({
    where: eq(pins.id, id),
    with: { session: true },
  });
  if (!pin || pin.session?.orgId !== auth.orgId) return Errors.notFound("Pin");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [updated] = await db.update(pins)
    .set({ ...(parsed.data as any), updatedAt: new Date() })
    .where(eq(pins.id, id))
    .returning();

  return ok(updated);
});

// ── DELETE /annotation/pins/:id ──────────────────────────────────────────────
annotationRouter.delete("/pins/:id", async (c) => {
  const auth = c.get("auth");
  const id   = c.req.param("id");
  const db   = createDb(c.env.DATABASE_URL);

  const pin = await db.query.pins.findFirst({
    where: eq(pins.id, id),
    with: { session: true },
  });
  if (!pin || pin.session?.orgId !== auth.orgId) return Errors.notFound("Pin");

  await db.delete(pins).where(eq(pins.id, id));
  return ok({ deleted: true });
});

// ── GET /annotation/pins?pageUrl= | ?issueId= ────────────────────────────────
// Pins for the overlay (by pageUrl — all pins on a page) OR for the web issue
// detail page (by issueId — the pins grouped under one issue). Org-scoped via
// the pin's session.
annotationRouter.get("/pins", async (c) => {
  const auth    = c.get("auth");
  const pageUrl = c.req.query("pageUrl");
  const issueId = c.req.query("issueId");
  if (!pageUrl && !issueId) return Errors.badRequest("pageUrl or issueId required");

  const db = createDb(c.env.DATABASE_URL);

  const scope = issueId
    ? and(eq(annotationSessions.orgId, auth.orgId), eq(pins.issueId, issueId))
    : and(eq(annotationSessions.orgId, auth.orgId), eq(annotationSessions.pageUrl, pageUrl!));

  const query = db
    .select({
      id:         pins.id,
      sessionId:  pins.sessionId,
      issueId:    pins.issueId,
      index:      pins.index,
      anchor:     pins.anchor,
      comment:    pins.comment,
      severity:   pins.severity,
      issueType:  pins.issueType,
      status:     pins.status,
      assigneeId: pins.assigneeId,
      labels:     pins.labels,
      createdAt:  pins.createdAt,
    })
    .from(pins)
    .innerJoin(annotationSessions, eq(pins.sessionId, annotationSessions.id))
    .where(scope);

  // Issue view → numbered order (#1, #2, #3). Page view → newest first.
  const rows = issueId
    ? await query.orderBy(pins.index)
    : await query.orderBy(desc(pins.createdAt));

  return ok(rows);
});

// ── POST /annotation/sessions/:id/submit ─────────────────────────────────────
// Finalise a session: set the grouping issue's real title (+ optional summary)
// and mark the session submitted.
const SubmitSessionSchema = z.object({
  title:   z.string().min(1).max(500),
  summary: z.string().max(5000).optional(),
});

annotationRouter.post("/sessions/:id/submit", async (c) => {
  const auth = c.get("auth");
  const id   = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = SubmitSessionSchema.safeParse(body);
  if (!parsed.success) return Errors.badRequest("Invalid input", parsed.error.flatten());

  const db = createDb(c.env.DATABASE_URL);

  const session = await db.query.annotationSessions.findFirst({
    where: and(eq(annotationSessions.id, id), eq(annotationSessions.orgId, auth.orgId)),
  });
  if (!session) return Errors.notFound("Session");

  // Find the grouping issue (all pins in the session share one issueId).
  const firstPin = await db.query.pins.findFirst({ where: eq(pins.sessionId, id) });
  if (firstPin?.issueId) {
    await db.update(issues)
      .set({
        title: parsed.data.title,
        ...(parsed.data.summary !== undefined && { summary: parsed.data.summary }),
        updatedAt: new Date(),
      })
      .where(eq(issues.id, firstPin.issueId));
  }

  await db.update(annotationSessions)
    .set({ status: "submitted", updatedAt: new Date() })
    .where(eq(annotationSessions.id, id));

  return ok({ submitted: true, issueId: firstPin?.issueId ?? null });
});
