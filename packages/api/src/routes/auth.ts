import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { createDb } from "../db/client.js";
import { users, orgs, memberships } from "../db/schema.js";
import { signJwt } from "../lib/jwt.js";
import { ok, Errors } from "../lib/response.js";
import { requireAuth } from "../middleware/auth.js";
import { SignupSchema, LoginSchema } from "@deveprobe/shared";
import type { Env } from "../lib/env.js";

export const authRouter = new Hono<{ Bindings: Env }>();

authRouter.post("/signup", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = SignupSchema.safeParse(body);
  if (!parsed.success) return Errors.badRequest("Invalid input", parsed.error.flatten());

  const { email, password, name, orgName } = parsed.data;
  const db = createDb(c.env.DATABASE_URL);

  const existing = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });
  if (existing) return Errors.conflict("Email already registered");

  const passwordHash = await bcrypt.hash(password, 12);
  const orgSlug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + nanoid(6);

  const [org] = await db.insert(orgs).values({
    name: orgName,
    slug: orgSlug,
  }).returning();

  const [user] = await db.insert(users).values({
    email: email.toLowerCase(),
    passwordHash,
    name,
  }).returning();

  await db.insert(memberships).values({
    userId: user!.id,
    orgId: org!.id,
    role: "admin",
  });

  const token = await signJwt(
    { sub: user!.id, org: org!.id, role: "admin" },
    c.env.JWT_SECRET,
  );

  return ok({ token, userId: user!.id, orgId: org!.id }, 201);
});

authRouter.post("/login", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) return Errors.badRequest("Invalid input");

  const { email, password } = parsed.data;
  const db = createDb(c.env.DATABASE_URL);

  const user = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });
  if (!user) return Errors.unauthorized();

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return Errors.unauthorized();

  const membership = await db.query.memberships.findFirst({
    where: eq(memberships.userId, user.id),
  });
  if (!membership) return Errors.forbidden();

  const token = await signJwt(
    { sub: user.id, org: membership.orgId, role: membership.role },
    c.env.JWT_SECRET,
  );

  return ok({ token, userId: user.id, orgId: membership.orgId });
});

authRouter.get("/me", async (c) => {
  const header = c.req.header("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return Errors.unauthorized();

  const { verifyJwt } = await import("../lib/jwt.js");
  const payload = await verifyJwt(token, c.env.JWT_SECRET).catch(() => null);
  if (!payload) return Errors.unauthorized();

  const db = createDb(c.env.DATABASE_URL);
  const user = await db.query.users.findFirst({
    where: eq(users.id, payload.sub),
  });
  if (!user) return Errors.unauthorized();

  return ok({
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    orgId: payload.org,
    role: payload.role,
  });
});

// ─── Workspaces ──────────────────────────────────────────────────────────────
// "Workspace" is the user-facing name for an Org. These endpoints let the
// signed-in user list every org they belong to, switch which one their next
// token is scoped to, and create a new one without going through full signup.

authRouter.get("/workspaces", requireAuth(), async (c) => {
  const auth = c.get("auth");
  const db = createDb(c.env.DATABASE_URL);

  const rows = await db
    .select({
      id: orgs.id,
      name: orgs.name,
      slug: orgs.slug,
      role: memberships.role,
    })
    .from(memberships)
    .innerJoin(orgs, eq(memberships.orgId, orgs.id))
    .where(eq(memberships.userId, auth.userId));

  return ok(rows.map((r) => ({ ...r, current: r.id === auth.orgId })));
});

authRouter.post("/workspaces/switch", requireAuth(), async (c) => {
  const auth = c.get("auth");
  const body = (await c.req.json().catch(() => null)) as { orgId?: string } | null;
  if (!body?.orgId) return Errors.badRequest("Missing orgId");

  const db = createDb(c.env.DATABASE_URL);

  const membership = await db.query.memberships.findFirst({
    where: and(eq(memberships.userId, auth.userId), eq(memberships.orgId, body.orgId)),
  });
  if (!membership) return Errors.forbidden();

  const token = await signJwt(
    { sub: auth.userId, org: membership.orgId, role: membership.role },
    c.env.JWT_SECRET,
  );

  return ok({ token, orgId: membership.orgId, role: membership.role });
});

authRouter.post("/workspaces", requireAuth(), async (c) => {
  const auth = c.get("auth");
  const body = (await c.req.json().catch(() => null)) as { name?: string } | null;
  const name = body?.name?.trim();
  if (!name || name.length < 1 || name.length > 100) {
    return Errors.badRequest("Workspace name must be 1–100 characters");
  }

  const db = createDb(c.env.DATABASE_URL);
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + nanoid(6);

  const [org] = await db.insert(orgs).values({ name, slug }).returning();

  await db.insert(memberships).values({
    userId: auth.userId,
    orgId: org!.id,
    role: "admin",
  });

  const token = await signJwt(
    { sub: auth.userId, org: org!.id, role: "admin" },
    c.env.JWT_SECRET,
  );

  return ok({ token, orgId: org!.id, name: org!.name, slug: org!.slug, role: "admin" }, 201);
});
