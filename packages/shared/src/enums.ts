export const IssueSource = {
  EXTENSION: "extension",
  SUBMISSION_LINK: "submission_link",
  DASHBOARD: "dashboard",
  INTEGRATION: "integration",
  API: "api",
} as const;
export type IssueSource = (typeof IssueSource)[keyof typeof IssueSource];

export const IssueMode = {
  SCREEN_RECORDING: "screen_recording",
  LIVE_ANNOTATION: "live_annotation",
  SCREENSHOT: "screenshot",
  IMPORTED: "imported",
} as const;
export type IssueMode = (typeof IssueMode)[keyof typeof IssueMode];

export const IssueStatus = {
  DRAFT: "draft",
  OPEN: "open",
  TRIAGED: "triaged",
  IN_PROGRESS: "in_progress",
  RESOLVED: "resolved",
  AWAITING_VERIFICATION: "awaiting_verification",
  VERIFIED: "verified",
  REOPENED: "reopened",
  ARCHIVED: "archived",
} as const;
export type IssueStatus = (typeof IssueStatus)[keyof typeof IssueStatus];

export const Severity = {
  CRITICAL: "critical",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
} as const;
export type Severity = (typeof Severity)[keyof typeof Severity];

export const Priority = {
  URGENT: "urgent",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
  NO_PRIORITY: "no_priority",
} as const;
export type Priority = (typeof Priority)[keyof typeof Priority];

export const MemberRole = {
  ADMIN: "admin",
  MEMBER: "member",
  VIEWER: "viewer",
  GUEST: "guest",
} as const;
export type MemberRole = (typeof MemberRole)[keyof typeof MemberRole];

export const TimelineEventKind = {
  CONSOLE: "console",
  NETWORK: "network",
  ERROR: "error",
  USER_ACTION: "user_action",
  PERFORMANCE: "performance",
  MARKER: "marker",
  NAVIGATION: "navigation",
} as const;
export type TimelineEventKind =
  (typeof TimelineEventKind)[keyof typeof TimelineEventKind];

export const ConsoleLevel = {
  LOG: "log",
  INFO: "info",
  WARN: "warn",
  ERROR: "error",
  DEBUG: "debug",
  TABLE: "table",
} as const;
export type ConsoleLevel = (typeof ConsoleLevel)[keyof typeof ConsoleLevel];

export const AttachmentType = {
  VIDEO: "video",
  THUMBNAIL: "thumbnail",
  SCREENSHOT: "screenshot",
  CLIP: "clip",
  EXPORT: "export",
} as const;
export type AttachmentType =
  (typeof AttachmentType)[keyof typeof AttachmentType];

export const AnnotationIssueType = {
  VISUAL_BUG: "visual_bug",
  LAYOUT_ISSUE: "layout_issue",
  COPY_ISSUE: "copy_issue",
  BROKEN_BEHAVIOR: "broken_behavior",
  MISSING_ELEMENT: "missing_element",
  ACCESSIBILITY: "accessibility",
  PERFORMANCE: "performance",
  OTHER: "other",
} as const;
export type AnnotationIssueType =
  (typeof AnnotationIssueType)[keyof typeof AnnotationIssueType];

export const IssueVisibility = {
  PRIVATE: "private",
  PUBLIC: "public",
} as const;
export type IssueVisibility =
  (typeof IssueVisibility)[keyof typeof IssueVisibility];

export const RecordingSessionStatus = {
  RECORDING: "recording",
  PROCESSING: "processing",
  DRAFT: "draft",
  UPLOADING: "uploading",
  SUBMITTED: "submitted",
  FAILED: "failed",
} as const;
export type RecordingSessionStatus =
  (typeof RecordingSessionStatus)[keyof typeof RecordingSessionStatus];

export const IntegrationProvider = {
  LINEAR: "linear",
  JIRA: "jira",
  GITHUB: "github",
  SLACK: "slack",
  TEAMS: "teams",
  SENTRY: "sentry",
  DATADOG: "datadog",
  ZENDESK: "zendesk",
  INTERCOM: "intercom",
  WEBHOOK: "webhook",
} as const;
export type IntegrationProvider =
  (typeof IntegrationProvider)[keyof typeof IntegrationProvider];
