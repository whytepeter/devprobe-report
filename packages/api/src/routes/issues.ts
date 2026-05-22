import { Hono } from "hono";
import { eq, and, desc, inArray } from "drizzle-orm";
import { z } from "zod";
import { createDb } from "../db/client.js";
import { issues, folders, recordingSessions, timelineEvents } from "../db/schema.js";
import { ok, Errors } from "../lib/response.js";
import { requireAuth } from "../middleware/auth.js";
import { CreateIssueSchema, UpdateIssueSchema, IssueStatus } from "@deveprobe/shared";

// API-internal: shape of POST /issues/bulk. Not exported via @deveprobe/shared
// because no client other than this API's own route consumer cares about the
// exact validation rules (clients call the endpoint, server rejects bad shapes).
const BulkIssueActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("delete"),         ids: z.array(z.string().uuid()).min(1).max(200) }),
  z.object({ action: z.literal("move-to-folder"), ids: z.array(z.string().uuid()).min(1).max(200), folderId: z.string().uuid().nullable() }),
  z.object({ action: z.literal("set-status"),     ids: z.array(z.string().uuid()).min(1).max(200), status: z.enum(Object.values(IssueStatus) as [IssueStatus, ...IssueStatus[]]) }),
]);
import type { Env } from "../lib/env.js";

export const issuesRouter = new Hono<{ Bindings: Env }>();

issuesRouter.use("*", requireAuth());

// Strip the password hash (and any future sensitive fields) before the user
// joins go out over the wire.
const PUBLIC_USER_COLUMNS = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
} as const;

issuesRouter.get("/", async (c) => {
  const auth = c.get("auth");
  const db = createDb(c.env.DATABASE_URL);

  const rows = await db.query.issues.findMany({
    where: eq(issues.orgId, auth.orgId),
    orderBy: [desc(issues.createdAt)],
    limit: 100,
    with: {
      createdBy: { columns: PUBLIC_USER_COLUMNS },
      attachments: true,
    },
  });

  return ok(rows);
});

issuesRouter.get("/:id", async (c) => {
  const auth = c.get("auth");
  const db = createDb(c.env.DATABASE_URL);
  const id = c.req.param("id");

  const issue = await db.query.issues.findFirst({
    where: and(eq(issues.id, id), eq(issues.orgId, auth.orgId)),
    with: {
      createdBy: { columns: PUBLIC_USER_COLUMNS },
      attachments: true,
    },
  });
  if (!issue) return Errors.notFound("Issue");

  return ok(issue);
});

issuesRouter.post("/", async (c) => {
  const auth = c.get("auth");
  const body = await c.req.json().catch(() => null);
  const parsed = CreateIssueSchema.safeParse(body);
  if (!parsed.success) return Errors.badRequest("Invalid input", parsed.error.flatten());

  const db = createDb(c.env.DATABASE_URL);

  // Folder is optional — when provided, validate it belongs to this org;
  // when omitted, the issue lives at the workspace root (no folder).
  let folderId: string | null = null;
  if (parsed.data.folderId) {
    const folder = await db.query.folders.findFirst({
      where: and(eq(folders.id, parsed.data.folderId), eq(folders.orgId, auth.orgId)),
    });
    if (!folder) return Errors.notFound("Folder");
    folderId = folder.id;
  }

  const [issue] = await db.insert(issues).values({
    orgId: auth.orgId,
    folderId,
    createdById: auth.userId,
    source: parsed.data.source,
    mode: parsed.data.mode,
    title: parsed.data.title,
    browserMeta: parsed.data.browserMeta ?? {},
    labels: parsed.data.labels ?? [],
    ...(parsed.data.summary !== undefined && { summary: parsed.data.summary }),
    ...(parsed.data.severity !== undefined && { severity: parsed.data.severity }),
    ...(parsed.data.priority !== undefined && { priority: parsed.data.priority }),
    ...(parsed.data.pageUrl !== undefined && { pageUrl: parsed.data.pageUrl }),
    ...(parsed.data.environment !== undefined && { environment: parsed.data.environment }),
    ...(parsed.data.assigneeId !== undefined && { assigneeId: parsed.data.assigneeId }),
    ...(parsed.data.visibility !== undefined && { visibility: parsed.data.visibility }),
  }).returning();

  return ok(issue, 201);
});

// ── PATCH /issues/:id ────────────────────────────────────────────────────────
// Update mutable fields on an issue (status, severity, assignee, folder,
// labels, etc.). Used by the issue details card, the drag-to-folder flow on
// the issues list, and the inline title/description edits on the issue page.
issuesRouter.patch("/:id", async (c) => {
  const auth = c.get("auth");
  const id   = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = UpdateIssueSchema.safeParse(body);
  if (!parsed.success) return Errors.badRequest("Invalid input", parsed.error.flatten());

  const db = createDb(c.env.DATABASE_URL);

  // Ownership check — issue must belong to caller's org.
  const issue = await db.query.issues.findFirst({
    where: and(eq(issues.id, id), eq(issues.orgId, auth.orgId)),
  });
  if (!issue) return Errors.notFound("Issue");

  // If a folder is targeted, verify it's in the same org. `null` clears it.
  if (parsed.data.folderId) {
    const folder = await db.query.folders.findFirst({
      where: and(eq(folders.id, parsed.data.folderId), eq(folders.orgId, auth.orgId)),
    });
    if (!folder) return Errors.notFound("Folder");
  }

  const [updated] = await db.update(issues)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(issues.id, id))
    .returning();

  return ok(updated);
});

// ── DELETE /issues/:id ───────────────────────────────────────────────────────
// Hard-deletes an issue. Cascades remove attachments, timeline events,
// comments, activity, and the recording session(s) via FK ON DELETE CASCADE
// defined in the schema. The R2 blobs themselves are NOT deleted here — they
// stay until the next purge sweep so accidental delete can be partially
// recovered for a short window (parked task).
issuesRouter.delete("/:id", async (c) => {
  const auth = c.get("auth");
  const id   = c.req.param("id");
  const db   = createDb(c.env.DATABASE_URL);

  const issue = await db.query.issues.findFirst({
    where: and(eq(issues.id, id), eq(issues.orgId, auth.orgId)),
  });
  if (!issue) return Errors.notFound("Issue");

  await db.delete(issues).where(eq(issues.id, id));
  return ok({ deleted: true });
});

// ── POST /issues/bulk ────────────────────────────────────────────────────────
// One call, many issues. Used by the bulk-actions toolbar on the Issues tab
// for "delete N", "move to folder", "mark resolved", etc. Server-side org
// check is per-id — any id that doesn't belong to the caller's org is
// silently skipped so a leaked id list can't be used to probe other orgs.
issuesRouter.post("/bulk", async (c) => {
  const auth = c.get("auth");
  const body = await c.req.json().catch(() => null);
  const parsed = BulkIssueActionSchema.safeParse(body);
  if (!parsed.success) return Errors.badRequest("Invalid input", parsed.error.flatten());

  const db = createDb(c.env.DATABASE_URL);

  // Filter to issues that actually belong to this org. Anything else is dropped.
  const owned = await db.query.issues.findMany({
    where: and(inArray(issues.id, parsed.data.ids), eq(issues.orgId, auth.orgId)),
    columns: { id: true },
  });
  const ownedIds = owned.map((i) => i.id);
  if (ownedIds.length === 0) return ok({ affected: 0 });

  switch (parsed.data.action) {
    case "delete":
      await db.delete(issues).where(inArray(issues.id, ownedIds));
      break;
    case "move-to-folder": {
      // Folder must be in caller's org (or null to clear).
      if (parsed.data.folderId) {
        const folder = await db.query.folders.findFirst({
          where: and(eq(folders.id, parsed.data.folderId), eq(folders.orgId, auth.orgId)),
        });
        if (!folder) return Errors.notFound("Folder");
      }
      await db.update(issues)
        .set({ folderId: parsed.data.folderId, updatedAt: new Date() })
        .where(inArray(issues.id, ownedIds));
      break;
    }
    case "set-status":
      // Status values are validated by the DB enum — invalid strings fail loudly.
      await db.update(issues)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .set({ status: parsed.data.status as any, updatedAt: new Date() })
        .where(inArray(issues.id, ownedIds));
      break;
  }

  return ok({ affected: ownedIds.length });
});

// ── GET /issues/:id/events ────────────────────────────────────────────────────
// Returns all timeline events for an issue ordered by timestampMs.
// Used by the web app's correlated-panels view on the issue detail page.
issuesRouter.get('/:id/events', async (c) => {
  const auth = c.get('auth');
  const issueId = c.req.param('id');
  const db = createDb(c.env.DATABASE_URL);

  const issue = await db.query.issues.findFirst({
    where: and(eq(issues.id, issueId), eq(issues.orgId, auth.orgId)),
  });
  if (!issue) return Errors.notFound('Issue');

  const events = await db.query.timelineEvents.findMany({
    where: eq(timelineEvents.issueId, issueId),
    orderBy: [timelineEvents.timestampMs],
    limit: 5000,
  });

  return ok(events);
});

// ── Timeline events ─────────────────────────────────────────────────────────
// POST /issues/:id/events
// Bulk-inserts the console / network / error / user_action / navigation /
// performance events captured during a screen recording. Per SCREEN_RECORDING_SPEC:
// every event shares a single timebase (ms from recording start) so the issue
// viewer can render synchronized panels alongside the video.
//
// A recording_session row is created here if one doesn't already exist for
// this issue — until we add a separate session-initiate route, the session
// is materialised lazily on first events submit.
type IncomingEvent = {
  kind:             'console' | 'network' | 'error' | 'user_action' | 'performance' | 'marker' | 'navigation';
  timestampMs:      number;
  startTimestampMs?: number;
  endTimestampMs?:   number;
  severity?:        'critical' | 'high' | 'medium' | 'low';
  summary:          string;
  data?:            Record<string, unknown>;
};

const ALLOWED_KINDS: ReadonlySet<IncomingEvent['kind']> = new Set([
  'console', 'network', 'error', 'user_action', 'performance', 'marker', 'navigation',
]);
const ALLOWED_SEVERITY: ReadonlySet<NonNullable<IncomingEvent['severity']>> = new Set([
  'critical', 'high', 'medium', 'low',
]);

issuesRouter.post('/:id/events', async (c) => {
  const auth = c.get('auth');
  const issueId = c.req.param('id');
  const body = await c.req.json().catch(() => null) as
    | { events?: IncomingEvent[]; pageUrl?: string; durationMs?: number; startedAt?: string; stoppedAt?: string }
    | null;
  if (!body?.events || !Array.isArray(body.events) || body.events.length === 0) {
    return Errors.badRequest('events[] required');
  }
  if (body.events.length > 5000) return Errors.badRequest('Too many events (max 5000)');

  const db = createDb(c.env.DATABASE_URL);

  // Issue must exist and belong to this org.
  const issue = await db.query.issues.findFirst({
    where: and(eq(issues.id, issueId), eq(issues.orgId, auth.orgId)),
  });
  if (!issue) return Errors.notFound('Issue');

  // Find or create the recording session for this issue.
  let session = await db.query.recordingSessions.findFirst({
    where: eq(recordingSessions.issueId, issueId),
  });
  if (!session) {
    [session] = await db.insert(recordingSessions).values({
      orgId:       auth.orgId,
      folderId:    issue.folderId ?? null,
      createdById: auth.userId,
      issueId,
      source:      issue.source ?? 'extension',
      pageUrl:     body.pageUrl ?? issue.pageUrl ?? '',
      status:      'submitted',
      ...(body.durationMs !== undefined && { durationMs: body.durationMs }),
      ...(body.startedAt && { startedAt: new Date(body.startedAt) }),
      ...(body.stoppedAt && { stoppedAt: new Date(body.stoppedAt) }),
    }).returning();
  }

  // Sanitise + bulk insert. Drop anything with the wrong shape — never trust
  // the client to send well-formed enum values.
  const rows = body.events
    .filter((e) => e && ALLOWED_KINDS.has(e.kind) && Number.isFinite(e.timestampMs) && typeof e.summary === 'string')
    .map((e) => ({
      sessionId:        session!.id,
      issueId,
      kind:             e.kind,
      timestampMs:      Math.max(0, Math.round(e.timestampMs)),
      summary:          e.summary.slice(0, 500),
      data:             (e.data && typeof e.data === 'object') ? e.data : {},
      ...(Number.isFinite(e.startTimestampMs) && { startTimestampMs: Math.round(e.startTimestampMs!) }),
      ...(Number.isFinite(e.endTimestampMs)   && { endTimestampMs:   Math.round(e.endTimestampMs!)   }),
      ...(e.severity && ALLOWED_SEVERITY.has(e.severity) && { severity: e.severity }),
    }));

  if (rows.length === 0) return Errors.badRequest('No valid events');

  // Drizzle's `insert(...).values(rows)` handles multi-row insert.
  await db.insert(timelineEvents).values(rows);

  return ok({ sessionId: session!.id, inserted: rows.length }, 201);
});
