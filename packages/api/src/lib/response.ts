import type { ApiSuccess, ApiError } from "@deveprobe/shared";

export function ok<T>(data: T, status = 200): Response {
  const body: ApiSuccess<T> = { ok: true, data };
  return Response.json(body, { status });
}

export function err(code: string, message: string, status: number, details?: unknown): Response {
  const body: ApiError = { ok: false, error: { code, message, details } };
  return Response.json(body, { status });
}

export const Errors = {
  unauthorized: () => err("UNAUTHORIZED", "Authentication required", 401),
  forbidden: () => err("FORBIDDEN", "Insufficient permissions", 403),
  notFound: (resource = "Resource") => err("NOT_FOUND", `${resource} not found`, 404),
  conflict: (msg: string) => err("CONFLICT", msg, 409),
  badRequest: (msg: string, details?: unknown) => err("BAD_REQUEST", msg, 400, details),
  internal: () => err("INTERNAL_ERROR", "An unexpected error occurred", 500),
};
