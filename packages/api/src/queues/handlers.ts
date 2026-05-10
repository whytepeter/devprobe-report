import type { Env } from "../lib/env.js";

export interface QueueMessage {
  type: string;
  payload: Record<string, unknown>;
}

export async function handleAiQueue(
  batch: MessageBatch<QueueMessage>,
  _env: Env,
): Promise<void> {
  for (const msg of batch.messages) {
    try {
      // Phase 7: AI processing consumer goes here
      console.log("[ai-queue]", msg.body.type, msg.body.payload);
      msg.ack();
    } catch (err) {
      console.error("[ai-queue] failed", err);
      msg.retry();
    }
  }
}

export async function handleIntegrationQueue(
  batch: MessageBatch<QueueMessage>,
  _env: Env,
): Promise<void> {
  for (const msg of batch.messages) {
    try {
      // Phase 8: integration send consumer goes here
      console.log("[integration-queue]", msg.body.type, msg.body.payload);
      msg.ack();
    } catch (err) {
      console.error("[integration-queue] failed", err);
      msg.retry();
    }
  }
}

export async function handleNotificationQueue(
  batch: MessageBatch<QueueMessage>,
  _env: Env,
): Promise<void> {
  for (const msg of batch.messages) {
    try {
      // Phase 8/9: notification consumer goes here
      console.log("[notification-queue]", msg.body.type, msg.body.payload);
      msg.ack();
    } catch (err) {
      console.error("[notification-queue] failed", err);
      msg.retry();
    }
  }
}
