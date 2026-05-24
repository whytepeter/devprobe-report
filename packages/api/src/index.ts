import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { authRouter } from "./routes/auth.js";
import { foldersRouter } from "./routes/folders.js";
import { issuesRouter } from "./routes/issues.js";
import { attachmentsRouter } from "./routes/attachments.js";
import { annotationRouter } from "./routes/annotation.js";
import {
  handleAiQueue,
  handleIntegrationQueue,
  handleNotificationQueue,
  type QueueMessage,
} from "./queues/handlers.js";
import type { Env } from "./lib/env.js";

const app = new Hono<{ Bindings: Env }>();

app.use("*", logger());
app.use("*", cors({
  origin: (origin) => {
    if (!origin) return "*";
    const allowed = ["http://localhost:5173", "http://localhost:4173"];
    if (allowed.includes(origin)) return origin;
    if (origin.startsWith("chrome-extension://")) return origin;
    return null;
  },
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
}));

app.get("/health", (c) => c.json({ ok: true, ts: Date.now() }));

app.route("/auth", authRouter);
app.route("/folders", foldersRouter);
app.route("/issues", issuesRouter);
app.route("/attachments", attachmentsRouter);
app.route("/annotation", annotationRouter);

// Phase 4+ routes mount here
// app.route("/recording-sessions", recordingSessionsRouter);
// app.route("/annotation-sessions", annotationSessionsRouter);
// app.route("/integrations", integrationsRouter);

app.notFound((c) => c.json({ ok: false, error: { code: "NOT_FOUND", message: "Route not found" } }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ ok: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } }, 500);
});

export default {
  fetch: app.fetch,
  async queue(batch: MessageBatch<QueueMessage>, env: Env): Promise<void> {
    switch (batch.queue) {
      case "deveprobe-ai":
        return handleAiQueue(batch, env);
      case "deveprobe-integrations":
        return handleIntegrationQueue(batch, env);
      case "deveprobe-notifications":
        return handleNotificationQueue(batch, env);
    }
  },
};
