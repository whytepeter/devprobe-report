export interface Env {
  DATABASE_URL: string;
  JWT_SECRET: string;
  AI_API_KEY: string;
  ENVIRONMENT: string;

  // R2
  ASSETS: R2Bucket;

  // Queues
  AI_QUEUE: Queue;
  INTEGRATION_QUEUE: Queue;
  NOTIFICATION_QUEUE: Queue;
}
