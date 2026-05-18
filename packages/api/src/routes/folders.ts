import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { createDb } from "../db/client.js";
import { folders } from "../db/schema.js";
import { ok, Errors } from "../lib/response.js";
import { requireAuth } from "../middleware/auth.js";
import { CreateFolderSchema } from "@deveprobe/shared";
import type { Env } from "../lib/env.js";

export const foldersRouter = new Hono<{ Bindings: Env }>();

foldersRouter.use("*", requireAuth());

foldersRouter.get("/", async (c) => {
  const auth = c.get("auth");
  const db = createDb(c.env.DATABASE_URL);

  const rows = await db.query.folders.findMany({
    where: and(eq(folders.orgId, auth.orgId)),
    orderBy: (f, { desc }) => [desc(f.createdAt)],
  });

  return ok(rows);
});

foldersRouter.post("/", async (c) => {
  const auth = c.get("auth");
  const body = await c.req.json().catch(() => null);
  const parsed = CreateFolderSchema.safeParse(body);
  if (!parsed.success) return Errors.badRequest("Invalid input", parsed.error.flatten());

  const db = createDb(c.env.DATABASE_URL);

  const existing = await db.query.folders.findFirst({
    where: and(eq(folders.orgId, auth.orgId), eq(folders.slug, parsed.data.slug)),
  });
  if (existing) return Errors.conflict("Folder slug already exists");

  const [folder] = await db.insert(folders).values({
    orgId: auth.orgId,
    name: parsed.data.name,
    slug: parsed.data.slug,
    ...(parsed.data.description !== undefined && { description: parsed.data.description }),
  }).returning();

  return ok(folder, 201);
});
