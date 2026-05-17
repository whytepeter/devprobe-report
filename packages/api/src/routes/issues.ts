import { Hono } from "hono";
import { eq, and, desc } from "drizzle-orm";
import { createDb } from "../db/client.js";
import { issues, projects } from "../db/schema.js";
import { ok, Errors } from "../lib/response.js";
import { requireAuth } from "../middleware/auth.js";
import { CreateIssueSchema } from "@deveprobe/shared";
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

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, parsed.data.projectId), eq(projects.orgId, auth.orgId)),
  });
  if (!project) return Errors.notFound("Project");

  const [issue] = await db.insert(issues).values({
    orgId: auth.orgId,
    projectId: parsed.data.projectId,
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
