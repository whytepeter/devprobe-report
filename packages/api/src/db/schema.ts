import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  uuid,
  index,
  uniqueIndex,
  varchar,
  real,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const issueModeEnum = pgEnum("issue_mode", [
  "screen_recording",
  "live_annotation",
  "screenshot",
  "imported",
]);

export const issueSourceEnum = pgEnum("issue_source", [
  "extension",
  "submission_link",
  "dashboard",
  "integration",
  "api",
]);

export const issueStatusEnum = pgEnum("issue_status", [
  "draft",
  "open",
  "triaged",
  "in_progress",
  "resolved",
  "awaiting_verification",
  "verified",
  "reopened",
  "archived",
]);

export const severityEnum = pgEnum("severity", [
  "critical",
  "high",
  "medium",
  "low",
]);

export const priorityEnum = pgEnum("priority", [
  "urgent",
  "high",
  "medium",
  "low",
  "no_priority",
]);

export const memberRoleEnum = pgEnum("member_role", [
  "admin",
  "member",
  "viewer",
  "guest",
]);

export const timelineEventKindEnum = pgEnum("timeline_event_kind", [
  "console",
  "network",
  "error",
  "user_action",
  "performance",
  "marker",
  "navigation",
]);

export const attachmentTypeEnum = pgEnum("attachment_type", [
  "video",
  "thumbnail",
  "screenshot",
  "clip",
  "export",
]);

export const attachmentStatusEnum = pgEnum("attachment_status", [
  "pending",    // row created, multipart upload not yet started
  "uploading",  // parts are being uploaded
  "complete",   // multipart upload finalised (or direct upload done)
  "failed",     // multipart upload aborted / error
]);

export const annotationIssueTypeEnum = pgEnum("annotation_issue_type", [
  "visual_bug",
  "layout_issue",
  "copy_issue",
  "broken_behavior",
  "missing_element",
  "accessibility",
  "performance",
  "other",
]);

export const issueVisibilityEnum = pgEnum("issue_visibility", [
  "private",
  "public",
]);

export const recordingSessionStatusEnum = pgEnum("recording_session_status", [
  "recording",
  "processing",
  "draft",
  "uploading",
  "submitted",
  "failed",
]);

export const integrationProviderEnum = pgEnum("integration_provider", [
  "linear",
  "jira",
  "github",
  "slack",
  "teams",
  "sentry",
  "datadog",
  "zendesk",
  "intercom",
  "webhook",
]);

export const annotationSessionStatusEnum = pgEnum("annotation_session_status", [
  "draft",
  "submitted",
  "archived",
]);

// ── Orgs ──────────────────────────────────────────────────────────────────────

export const orgs = pgTable("orgs", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 60 }).notNull(),
  plan: varchar("plan", { length: 50 }).notNull().default("free"),
  aiEnabled: boolean("ai_enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("orgs_slug_idx").on(t.slug),
]);

// ── Users ─────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("users_email_idx").on(t.email),
]);

// ── Memberships ───────────────────────────────────────────────────────────────

export const memberships = pgTable("memberships", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  orgId: uuid("org_id").notNull().references(() => orgs.id, { onDelete: "cascade" }),
  role: memberRoleEnum("role").notNull().default("member"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("memberships_user_org_idx").on(t.userId, t.orgId),
  index("memberships_org_idx").on(t.orgId),
]);

// ── Auth sessions ─────────────────────────────────────────────────────────────

export const authSessions = pgTable("auth_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  orgId: uuid("org_id").notNull().references(() => orgs.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("auth_sessions_token_idx").on(t.tokenHash),
  index("auth_sessions_user_idx").on(t.userId),
]);

// ── Folders ───────────────────────────────────────────────────────────────────

export const folders = pgTable("folders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => orgs.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 60 }).notNull(),
  description: text("description"),
  captureRules: jsonb("capture_rules").notNull().default({}),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("folders_org_slug_idx").on(t.orgId, t.slug),
  index("folders_org_idx").on(t.orgId),
]);

// ── Environments ──────────────────────────────────────────────────────────────

export const environments = pgTable("environments", {
  id: uuid("id").primaryKey().defaultRandom(),
  folderId: uuid("folder_id").notNull().references(() => folders.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  urlPatterns: jsonb("url_patterns").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("environments_folder_idx").on(t.folderId),
]);

// ── Issues ────────────────────────────────────────────────────────────────────

export const issues = pgTable("issues", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => orgs.id, { onDelete: "cascade" }),
  folderId: uuid("folder_id").references(() => folders.id, { onDelete: "set null" }),
  createdById: uuid("created_by_id").notNull().references(() => users.id),
  source: issueSourceEnum("source").notNull(),
  mode: issueModeEnum("mode").notNull(),
  title: text("title").notNull(),
  summary: text("summary"),
  status: issueStatusEnum("status").notNull().default("open"),
  severity: severityEnum("severity"),
  priority: priorityEnum("priority"),
  pageUrl: text("page_url"),
  environment: varchar("environment", { length: 100 }),
  browserMeta: jsonb("browser_meta"),
  assigneeId: uuid("assignee_id").references(() => users.id),
  labels: jsonb("labels").notNull().default([]),
  duplicateGroupId: uuid("duplicate_group_id"),
  externalLinks: jsonb("external_links").notNull().default([]),
  visibility: issueVisibilityEnum("visibility").notNull().default("private"),
  aiConfidence: real("ai_confidence"),
  privacyFlags: jsonb("privacy_flags").notNull().default([]),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("issues_org_idx").on(t.orgId),
  index("issues_folder_idx").on(t.folderId),
  index("issues_status_idx").on(t.status),
  index("issues_assignee_idx").on(t.assigneeId),
  index("issues_created_at_idx").on(t.createdAt),
  index("issues_duplicate_group_idx").on(t.duplicateGroupId),
]);

// ── Issue links ───────────────────────────────────────────────────────────────

export const issueLinks = pgTable("issue_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  issueId: uuid("issue_id").notNull().references(() => issues.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  visibility: issueVisibilityEnum("visibility").notNull().default("private"),
  passwordHash: text("password_hash"),
  allowedDomains: jsonb("allowed_domains").notNull().default([]),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("issue_links_token_idx").on(t.token),
  index("issue_links_issue_idx").on(t.issueId),
]);

// ── Recording sessions ────────────────────────────────────────────────────────

export const recordingSessions = pgTable("recording_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => orgs.id, { onDelete: "cascade" }),
  folderId: uuid("folder_id").references(() => folders.id, { onDelete: "set null" }),
  createdById: uuid("created_by_id").notNull().references(() => users.id),
  issueId: uuid("issue_id").references(() => issues.id),
  source: varchar("source", { length: 30 }).notNull(),
  pageUrl: text("page_url").notNull(),
  environment: varchar("environment", { length: 100 }),
  status: recordingSessionStatusEnum("status").notNull().default("recording"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  stoppedAt: timestamp("stopped_at", { withTimezone: true }),
  durationMs: integer("duration_ms"),
  captureSettings: jsonb("capture_settings").notNull().default({}),
  privacySettings: jsonb("privacy_settings").notNull().default({}),
  videoAttachmentId: uuid("video_attachment_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("recording_sessions_issue_idx").on(t.issueId),
  index("recording_sessions_folder_idx").on(t.folderId),
]);

// ── Timeline events ───────────────────────────────────────────────────────────

export const timelineEvents = pgTable("timeline_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull().references(() => recordingSessions.id, { onDelete: "cascade" }),
  issueId: uuid("issue_id").notNull().references(() => issues.id, { onDelete: "cascade" }),
  kind: timelineEventKindEnum("kind").notNull(),
  timestampMs: integer("timestamp_ms").notNull(),
  startTimestampMs: integer("start_timestamp_ms"),
  endTimestampMs: integer("end_timestamp_ms"),
  severity: severityEnum("severity"),
  summary: text("summary").notNull(),
  data: jsonb("data").notNull().default({}),
  redacted: boolean("redacted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("timeline_events_issue_idx").on(t.issueId),
  index("timeline_events_session_idx").on(t.sessionId),
  index("timeline_events_kind_idx").on(t.kind),
  index("timeline_events_timestamp_idx").on(t.timestampMs),
]);

// ── Attachments ───────────────────────────────────────────────────────────────

export const attachments = pgTable("attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").references(() => recordingSessions.id, { onDelete: "set null" }),
  issueId: uuid("issue_id").references(() => issues.id, { onDelete: "cascade" }),
  pinId: uuid("pin_id"),
  type: attachmentTypeEnum("type").notNull(),
  r2Key: text("r2_key").notNull(),
  r2UploadId: text("r2_upload_id"),           // R2 multipart upload ID; null for direct uploads
  status: attachmentStatusEnum("status").notNull().default("complete"),
  contentType: varchar("content_type", { length: 100 }).notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  durationMs: integer("duration_ms"),
  width: integer("width"),
  height: integer("height"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("attachments_issue_idx").on(t.issueId),
  index("attachments_session_idx").on(t.sessionId),
]);

// ── Annotation sessions ───────────────────────────────────────────────────────

export const annotationSessions = pgTable("annotation_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => orgs.id, { onDelete: "cascade" }),
  folderId: uuid("folder_id").references(() => folders.id, { onDelete: "set null" }),
  createdById: uuid("created_by_id").notNull().references(() => users.id),
  pageUrl: text("page_url").notNull(),
  urlPath: text("url_path").notNull(),
  environment: varchar("environment", { length: 100 }),
  status: annotationSessionStatusEnum("status").notNull().default("draft"),
  pinCount: integer("pin_count").notNull().default(0),
  reviewTag: varchar("review_tag", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("annotation_sessions_folder_idx").on(t.folderId),
  index("annotation_sessions_page_url_idx").on(t.pageUrl),
]);

// ── Pins ──────────────────────────────────────────────────────────────────────

export const pins = pgTable("pins", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull().references(() => annotationSessions.id, { onDelete: "cascade" }),
  issueId: uuid("issue_id").references(() => issues.id),
  index: integer("index").notNull(),
  anchor: jsonb("anchor").notNull(),
  offsetX: real("offset_x").notNull(),
  offsetY: real("offset_y").notNull(),
  comment: text("comment").notNull(),
  issueType: annotationIssueTypeEnum("issue_type").notNull(),
  severity: severityEnum("severity").notNull().default("medium"),
  priority: priorityEnum("priority"),
  assigneeId: uuid("assignee_id").references(() => users.id),
  labels: jsonb("labels").notNull().default([]),
  screenshotAttachmentId: uuid("screenshot_attachment_id"),
  clipAttachmentId: uuid("clip_attachment_id"),
  status: issueStatusEnum("status").notNull().default("open"),
  createdById: uuid("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("pins_session_idx").on(t.sessionId),
  index("pins_issue_idx").on(t.issueId),
]);

// ── Comments ──────────────────────────────────────────────────────────────────

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  issueId: uuid("issue_id").notNull().references(() => issues.id, { onDelete: "cascade" }),
  pinId: uuid("pin_id").references(() => pins.id, { onDelete: "set null" }),
  authorId: uuid("author_id").notNull().references(() => users.id),
  body: text("body").notNull(),
  reactions: jsonb("reactions").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("comments_issue_idx").on(t.issueId),
]);

// ── Activity events ───────────────────────────────────────────────────────────

export const activityEvents = pgTable("activity_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  issueId: uuid("issue_id").notNull().references(() => issues.id, { onDelete: "cascade" }),
  actorId: uuid("actor_id").notNull().references(() => users.id),
  type: varchar("type", { length: 60 }).notNull(),
  data: jsonb("data").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("activity_events_issue_idx").on(t.issueId),
  index("activity_events_created_at_idx").on(t.createdAt),
]);

// ── AI outputs ────────────────────────────────────────────────────────────────

export const aiOutputs = pgTable("ai_outputs", {
  id: uuid("id").primaryKey().defaultRandom(),
  issueId: uuid("issue_id").notNull().references(() => issues.id, { onDelete: "cascade" }),
  title: text("title"),
  summary: text("summary"),
  reproductionSteps: text("reproduction_steps"),
  severity: severityEnum("severity"),
  priority: priorityEnum("priority"),
  rootCauseHints: text("root_cause_hints"),
  verificationChecklist: jsonb("verification_checklist"),
  duplicateCandidates: jsonb("duplicate_candidates").notNull().default([]),
  suggestedFields: jsonb("suggested_fields"),
  modelId: varchar("model_id", { length: 100 }).notNull(),
  promptTokens: integer("prompt_tokens").notNull().default(0),
  completionTokens: integer("completion_tokens").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("ai_outputs_issue_idx").on(t.issueId),
]);

// ── Duplicate groups ──────────────────────────────────────────────────────────

export const duplicateGroups = pgTable("duplicate_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => orgs.id, { onDelete: "cascade" }),
  canonicalIssueId: uuid("canonical_issue_id").references(() => issues.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Integrations ──────────────────────────────────────────────────────────────

export const integrations = pgTable("integrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => orgs.id, { onDelete: "cascade" }),
  provider: integrationProviderEnum("provider").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  credentialsEnc: text("credentials_enc").notNull(),
  config: jsonb("config").notNull().default({}),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("integrations_org_idx").on(t.orgId),
  uniqueIndex("integrations_org_provider_idx").on(t.orgId, t.provider),
]);

// ── Integration configs (per folder) ─────────────────────────────────────────

export const integrationConfigs = pgTable("integration_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  integrationId: uuid("integration_id").notNull().references(() => integrations.id, { onDelete: "cascade" }),
  folderId: uuid("folder_id").notNull().references(() => folders.id, { onDelete: "cascade" }),
  fieldMappings: jsonb("field_mappings").notNull().default({}),
  autoSend: boolean("auto_send").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("integration_configs_int_folder_idx").on(t.integrationId, t.folderId),
]);

// ── Invitations ───────────────────────────────────────────────────────────────

export const invitations = pgTable("invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => orgs.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(),
  role: memberRoleEnum("role").notNull().default("member"),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdById: uuid("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("invitations_token_idx").on(t.token),
  index("invitations_org_email_idx").on(t.orgId, t.email),
]);

// ── Relations ─────────────────────────────────────────────────────────────────

export const orgsRelations = relations(orgs, ({ many }) => ({
  memberships: many(memberships),
  folders: many(folders),
  issues: many(issues),
}));

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
  issues: many(issues),
  comments: many(comments),
}));

export const foldersRelations = relations(folders, ({ one, many }) => ({
  org: one(orgs, { fields: [folders.orgId], references: [orgs.id] }),
  environments: many(environments),
  issues: many(issues),
}));

export const environmentsRelations = relations(environments, ({ one }) => ({
  folder: one(folders, { fields: [environments.folderId], references: [folders.id] }),
}));

export const issuesRelations = relations(issues, ({ one, many }) => ({
  folder: one(folders, { fields: [issues.folderId], references: [folders.id] }),
  createdBy: one(users, { fields: [issues.createdById], references: [users.id] }),
  assignee: one(users, { fields: [issues.assigneeId], references: [users.id] }),
  timelineEvents: many(timelineEvents),
  attachments: many(attachments),
  comments: many(comments),
  activityEvents: many(activityEvents),
  aiOutput: one(aiOutputs, { fields: [issues.id], references: [aiOutputs.issueId] }),
  issueLink: one(issueLinks, { fields: [issues.id], references: [issueLinks.issueId] }),
}));

export const recordingSessionsRelations = relations(recordingSessions, ({ one, many }) => ({
  issue: one(issues, { fields: [recordingSessions.issueId], references: [issues.id] }),
  timelineEvents: many(timelineEvents),
  attachments: many(attachments),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  issue: one(issues, { fields: [attachments.issueId], references: [issues.id] }),
  session: one(recordingSessions, { fields: [attachments.sessionId], references: [recordingSessions.id] }),
}));

export const annotationSessionsRelations = relations(annotationSessions, ({ many }) => ({
  pins: many(pins),
}));

export const pinsRelations = relations(pins, ({ one }) => ({
  session: one(annotationSessions, { fields: [pins.sessionId], references: [annotationSessions.id] }),
  issue: one(issues, { fields: [pins.issueId], references: [issues.id] }),
}));
