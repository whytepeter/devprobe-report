CREATE TYPE "public"."attachment_status" AS ENUM('pending', 'uploading', 'complete', 'failed');--> statement-breakpoint
ALTER TABLE "attachments" ADD COLUMN "r2_upload_id" text;--> statement-breakpoint
ALTER TABLE "attachments" ADD COLUMN "status" "attachment_status" DEFAULT 'complete' NOT NULL;