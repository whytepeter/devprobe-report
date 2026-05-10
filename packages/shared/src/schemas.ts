import { z } from "zod";
import {
  IssueSource,
  IssueMode,
  IssueStatus,
  Severity,
  Priority,
  MemberRole,
  TimelineEventKind,
  ConsoleLevel,
  AttachmentType,
  AnnotationIssueType,
  IssueVisibility,
  RecordingSessionStatus,
  IntegrationProvider,
} from "./enums.js";

// ── Auth ──────────────────────────────────────────────────────────────────────

export const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100),
  orgName: z.string().min(1).max(100),
});
export type SignupInput = z.infer<typeof SignupSchema>;

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});
export type LoginInput = z.infer<typeof LoginSchema>;

// ── Issue ─────────────────────────────────────────────────────────────────────

export const CreateIssueSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(500),
  summary: z.string().optional(),
  source: z.enum(Object.values(IssueSource) as [IssueSource, ...IssueSource[]]),
  mode: z.enum(Object.values(IssueMode) as [IssueMode, ...IssueMode[]]),
  severity: z.enum(Object.values(Severity) as [Severity, ...Severity[]]).optional(),
  priority: z.enum(Object.values(Priority) as [Priority, ...Priority[]]).optional(),
  pageUrl: z.string().url().optional(),
  environment: z.string().max(100).optional(),
  browserMeta: z.record(z.unknown()).optional(),
  assigneeId: z.string().uuid().optional(),
  labels: z.array(z.string()).optional(),
});
export type CreateIssueInput = z.infer<typeof CreateIssueSchema>;

export const UpdateIssueSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  summary: z.string().optional(),
  status: z.enum(Object.values(IssueStatus) as [IssueStatus, ...IssueStatus[]]).optional(),
  severity: z.enum(Object.values(Severity) as [Severity, ...Severity[]]).optional(),
  priority: z.enum(Object.values(Priority) as [Priority, ...Priority[]]).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  labels: z.array(z.string()).optional(),
  visibility: z.enum(Object.values(IssueVisibility) as [IssueVisibility, ...IssueVisibility[]]).optional(),
});
export type UpdateIssueInput = z.infer<typeof UpdateIssueSchema>;

// ── Recording Session ─────────────────────────────────────────────────────────

export const CreateRecordingSessionSchema = z.object({
  projectId: z.string().uuid(),
  source: z.enum(["extension", "submission_link"]),
  pageUrl: z.string().url(),
  environment: z.string().max(100).optional(),
  captureSettings: z.object({
    captureConsole: z.boolean().default(true),
    captureNetwork: z.boolean().default(false),
    captureAudio: z.boolean().default(false),
    captureMic: z.boolean().default(false),
    maxDurationSeconds: z.number().int().min(1).max(600).default(300),
  }),
  privacySettings: z.object({
    redactNetworkBodies: z.boolean().default(true),
    redactSensitiveHeaders: z.boolean().default(true),
    customRedactPatterns: z.array(z.string()).default([]),
  }),
});
export type CreateRecordingSessionInput = z.infer<typeof CreateRecordingSessionSchema>;

// ── Timeline Event ────────────────────────────────────────────────────────────

export const TimelineEventSchema = z.object({
  kind: z.enum(Object.values(TimelineEventKind) as [TimelineEventKind, ...TimelineEventKind[]]),
  timestampMs: z.number().int().nonnegative(),
  startTimestampMs: z.number().int().nonnegative().optional(),
  endTimestampMs: z.number().int().nonnegative().optional(),
  severity: z.enum(Object.values(Severity) as [Severity, ...Severity[]]).nullable().optional(),
  summary: z.string().max(1000),
  data: z.record(z.unknown()),
});
export type TimelineEventInput = z.infer<typeof TimelineEventSchema>;

export const BulkTimelineEventsSchema = z.object({
  sessionId: z.string().uuid(),
  events: z.array(TimelineEventSchema).max(5000),
});

// ── Console Event ─────────────────────────────────────────────────────────────

export const ConsoleEventDataSchema = z.object({
  level: z.enum(Object.values(ConsoleLevel) as [ConsoleLevel, ...ConsoleLevel[]]),
  message: z.string(),
  args: z.array(z.unknown()).optional(),
  stackTrace: z.string().optional(),
  sourceUrl: z.string().optional(),
  line: z.number().int().optional(),
  column: z.number().int().optional(),
});
export type ConsoleEventData = z.infer<typeof ConsoleEventDataSchema>;

// ── Network Event ─────────────────────────────────────────────────────────────

export const NetworkEventDataSchema = z.object({
  url: z.string(),
  method: z.string().toUpperCase(),
  statusCode: z.number().int().optional(),
  requestHeaders: z.record(z.string()).optional(),
  responseHeaders: z.record(z.string()).optional(),
  requestBody: z.string().optional(),
  responseBody: z.string().optional(),
  durationMs: z.number().optional(),
  sizeBytes: z.number().int().optional(),
  failureReason: z.string().optional(),
  resourceType: z.string().optional(),
  initiator: z.string().optional(),
});
export type NetworkEventData = z.infer<typeof NetworkEventDataSchema>;

// ── Annotation ────────────────────────────────────────────────────────────────

export const AnchorSchema = z.object({
  selector: z.string().optional(),
  xpath: z.string().optional(),
  tagName: z.string(),
  role: z.string().optional(),
  accessibleName: z.string().optional(),
  textFingerprint: z.string().optional(),
  attributeFingerprint: z.string().optional(),
  ancestorFingerprint: z.string().optional(),
  boundingBox: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }),
  viewportSize: z.object({ width: z.number(), height: z.number() }),
  devicePixelRatio: z.number(),
  scrollPosition: z.object({ x: z.number(), y: z.number() }),
  urlPath: z.string(),
});
export type Anchor = z.infer<typeof AnchorSchema>;

export const CreatePinSchema = z.object({
  sessionId: z.string().uuid(),
  anchor: AnchorSchema,
  offsetX: z.number(),
  offsetY: z.number(),
  comment: z.string().min(1).max(5000),
  issueType: z.enum(Object.values(AnnotationIssueType) as [AnnotationIssueType, ...AnnotationIssueType[]]),
  severity: z.enum(Object.values(Severity) as [Severity, ...Severity[]]).default("medium"),
  priority: z.enum(Object.values(Priority) as [Priority, ...Priority[]]).optional(),
  assigneeId: z.string().uuid().optional(),
  labels: z.array(z.string()).default([]),
});
export type CreatePinInput = z.infer<typeof CreatePinSchema>;

// ── Attachment ────────────────────────────────────────────────────────────────

export const RequestUploadUrlSchema = z.object({
  issueId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  pinId: z.string().uuid().optional(),
  type: z.enum(Object.values(AttachmentType) as [AttachmentType, ...AttachmentType[]]),
  contentType: z.string(),
  sizeBytes: z.number().int().positive(),
});
export type RequestUploadUrlInput = z.infer<typeof RequestUploadUrlSchema>;

// ── Project ───────────────────────────────────────────────────────────────────

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
});
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

export const CreateEnvironmentSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(100),
  urlPatterns: z.array(z.string()).default([]),
});
export type CreateEnvironmentInput = z.infer<typeof CreateEnvironmentSchema>;

// ── Integration ───────────────────────────────────────────────────────────────

export const SendToIntegrationSchema = z.object({
  issueId: z.string().uuid(),
  provider: z.enum(Object.values(IntegrationProvider) as [IntegrationProvider, ...IntegrationProvider[]]),
  fieldOverrides: z.record(z.unknown()).optional(),
});
export type SendToIntegrationInput = z.infer<typeof SendToIntegrationSchema>;

// ── Common response shapes ────────────────────────────────────────────────────

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export type Pagination = z.infer<typeof PaginationSchema>;

export const IssueFiltersSchema = z.object({
  projectId: z.string().uuid().optional(),
  status: z.enum(Object.values(IssueStatus) as [IssueStatus, ...IssueStatus[]]).optional(),
  severity: z.enum(Object.values(Severity) as [Severity, ...Severity[]]).optional(),
  assigneeId: z.string().uuid().optional(),
  source: z.enum(Object.values(IssueSource) as [IssueSource, ...IssueSource[]]).optional(),
  mode: z.enum(Object.values(IssueMode) as [IssueMode, ...IssueMode[]]).optional(),
  q: z.string().max(200).optional(),
});
export type IssueFilters = z.infer<typeof IssueFiltersSchema>;

// ── Member role ────────────────────────────────────────────────────────────────

export const InviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(Object.values(MemberRole) as [MemberRole, ...MemberRole[]]).default("member"),
});
export type InviteMemberInput = z.infer<typeof InviteMemberSchema>;
