import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { createDb } from "../db/client.js";
import { projects } from "../db/schema.js";
import { ok, Errors } from "../lib/response.js";
import { requireAuth } from "../middleware/auth.js";
import { CreateProjectSchema } from "@deveprobe/shared";
import type { Env } from "../lib/env.js";

export const projectsRouter = new Hono<{ Bindings: Env }>();

projectsRouter.use("*", requireAuth());

projectsRouter.get("/", async (c) => {
  const auth = c.get("auth");
  const db = createDb(c.env.DATABASE_URL);

  const rows = await db.query.projects.findMany({
    where: and(eq(projects.orgId, auth.orgId)),
    orderBy: (p, { desc }) => [desc(p.createdAt)],
  });

  return ok(rows);
});

projectsRouter.post("/", async (c) => {
  const auth = c.get("auth");
  const body = await c.req.json().catch(() => null);
  const parsed = CreateProjectSchema.safeParse(body);
  if (!parsed.success) return Errors.badRequest("Invalid input", parsed.error.flatten());

  const db = createDb(c.env.DATABASE_URL);

  const existing = await db.query.projects.findFirst({
    where: and(eq(projects.orgId, auth.orgId), eq(projects.slug, parsed.data.slug)),
  });
  if (existing) return Errors.conflict("Project slug already exists");

  const [project] = await db.insert(projects).values({
    orgId: auth.orgId,
    name: parsed.data.name,
    slug: parsed.data.slug,
    ...(parsed.data.description !== undefined && { description: parsed.data.description }),
  }).returning();

  return ok(project, 201);
});
