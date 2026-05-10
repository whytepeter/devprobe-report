import type { Context, MiddlewareHandler, Next } from "hono";
import { verifyJwt, type JwtPayload } from "../lib/jwt.js";
import { Errors } from "../lib/response.js";
import type { Env } from "../lib/env.js";

export interface AuthContext {
  userId: string;
  orgId: string;
  role: string;
}

declare module "hono" {
  interface ContextVariableMap {
    auth: AuthContext;
  }
}

export function requireAuth(): MiddlewareHandler<{ Bindings: Env }> {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const header = c.req.header("Authorization");
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) return Errors.unauthorized();

    try {
      const payload: JwtPayload = await verifyJwt(token, c.env.JWT_SECRET);
      c.set("auth", { userId: payload.sub, orgId: payload.org, role: payload.role });
    } catch {
      return Errors.unauthorized();
    }

    await next();
  };
}
