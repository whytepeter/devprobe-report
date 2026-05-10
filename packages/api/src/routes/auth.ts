import { Hono } from "hono";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { createDb } from "../db/client.js";
import { users, orgs, memberships } from "../db/schema.js";
import { signJwt } from "../lib/jwt.js";
import { ok, Errors } from "../lib/response.js";
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
