import type {
  IssueSource,
  IssueMode,
  IssueStatus,
  Severity,
  Priority,
  MemberRole,
  TimelineEventKind,
  AttachmentType,
  AnnotationIssueType,
  IssueVisibility,
  RecordingSessionStatus,
  IntegrationProvider,
} from "./enums.js";
import type { Anchor } from "./schemas.js";

// ── Domain types (mirrors DB rows with camelCase) ─────────────────────────────

export interface Org {
  id: string;
  name: string;
  slug: string;
  plan: string;
  aiEnabled: boolean;
  createdAt: Date;
}

export interface User {
  id: string;
  orgId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  createdAt: Date;
}

export interface Membership {
  userId: string;
  orgId: string;
  role: MemberRole;
  joinedAt: Date;
}

export interface Project {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  description: string | null;
  archivedAt: Date | null;
  createdAt: Date;
}

export interface Environment {
  id: string;
  projectId: string;
  name: string;
  urlPatterns: string[];
  createdAt: Date;
}

export interface Issue {
  id: string;
  orgId: string;
  projectId: string;
  createdById: string;
  source: IssueSource;
  mode: IssueMode;
  title: string;
  summary: string | null;
  status: IssueStatus;
  severity: Severity | null;
  priority: Priority | null;
  pageUrl: string | null;
  environment: string | null;
  browserMeta: Record<string, unknown> | null;
  assigneeId: string | null;
  labels: string[];
  duplicateGroupId: string | null;
  externalLinks: ExternalLink[];
  visibility: IssueVisibility;
  aiConfidence: number | null;
  privacyFlags: string[];
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExternalLink {
  provider: IntegrationProvider;
  externalId: string;
  url: string;
  syncedAt: Date | null;
}

export interface RecordingSession {
  id: string;
  orgId: string;
  projectId: string;
  createdById: string;
  issueId: string | null;
  source: "extension" | "submission_link";
  pageUrl: string;
  environment: string | null;
  status: RecordingSessionStatus;
  startedAt: Date | null;
  stoppedAt: Date | null;
  durationMs: number | null;
  captureSettings: Record<string, unknown>;
  privacySettings: Record<string, unknown>;
  videoAttachmentId: string | null;
  createdAt: Date;
}

export interface TimelineEvent {
  id: string;
  sessionId: string;
  issueId: string;
  kind: TimelineEventKind;
  timestampMs: number;
  startTimestampMs: number | null;
  endTimestampMs: number | null;
  severity: Severity | null;
  summary: string;
  data: Record<string, unknown>;
  redacted: boolean;
  createdAt: Date;
}

export interface Attachment {
  id: string;
  sessionId: string | null;
  issueId: string | null;
  pinId: string | null;
  type: AttachmentType;
  r2Key: string;
  contentType: string;
  sizeBytes: number;
  durationMs: number | null;
  width: number | null;
  height: number | null;
  createdAt: Date;
}

export interface AnnotationSession {
  id: string;
  orgId: string;
  projectId: string;
  createdById: string;
  pageUrl: string;
  urlPath: string;
  environment: string | null;
  status: "draft" | "submitted" | "archived";
  pinCount: number;
  reviewTag: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Pin {
  id: string;
  sessionId: string;
  issueId: string | null;
  index: number;
  anchor: Anchor;
  offsetX: number;
  offsetY: number;
  comment: string;
  issueType: AnnotationIssueType;
  severity: Severity;
  priority: Priority | null;
  assigneeId: string | null;
  labels: string[];
  screenshotAttachmentId: string | null;
  clipAttachmentId: string | null;
  status: IssueStatus;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Comment {
  id: string;
  issueId: string;
  pinId: string | null;
  authorId: string;
  body: string;
  reactions: Record<string, string[]>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActivityEvent {
  id: string;
  issueId: string;
  actorId: string;
  type: string;
  data: Record<string, unknown>;
  createdAt: Date;
}

export interface AiOutput {
  id: string;
  issueId: string;
  title: string | null;
  summary: string | null;
  reproductionSteps: string | null;
  severity: Severity | null;
  priority: Priority | null;
  rootCauseHints: string | null;
  verificationChecklist: string[] | null;
  duplicateCandidates: string[];
  suggestedFields: Record<string, unknown> | null;
  modelId: string;
  promptTokens: number;
  completionTokens: number;
  createdAt: Date;
}

export interface IssueLink {
  id: string;
  issueId: string;
  token: string;
  visibility: IssueVisibility;
  passwordHash: string | null;
  allowedDomains: string[];
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

// ── API response wrappers ─────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiError {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ── Browser metadata (captured by extension) ─────────────────────────────────

export interface BrowserMeta {
  userAgent: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  deviceType: "desktop" | "tablet" | "mobile";
  viewport: { width: number; height: number };
  screenSize: { width: number; height: number };
  devicePixelRatio: number;
  timezone: string;
  language: string;
  colorScheme: "light" | "dark" | "no-preference";
  pageUrl: string;
  pageTitle: string;
  releaseVersion: string | null;
  commitSha: string | null;
  buildId: string | null;
  featureFlags: Record<string, boolean>;
  networkType: string | null;
}
