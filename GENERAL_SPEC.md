# General Product Spec

## Product Name
Working name: DevProbe.

## Product Summary
DevProbe is a high-end bug reporting platform for teams that need complete, developer-ready bug reports with minimal effort from reporters. It combines browser-based screen recording, live page annotation, technical evidence capture, AI triage, integrations, and issue lifecycle management.

The product should compete with Jam.dev by matching its core capture and sharing workflows, then go further with live issue pins, stronger workflow automation, richer AI debugging, privacy-first capture, and fix verification.

## Core Promise
Capture once, debug immediately, route automatically, verify confidently.

## Target Users
- QA testers need fast reports with video, steps, severity, screenshots, and technical evidence.
- Developers need actionable reports with logs, network requests, stack traces, environment metadata, and reproduction context.
- Product managers and designers need visual feedback on real UI.
- Support teams need customer-friendly public issue submission links that do not require extension installation.
- Engineering managers need issue volume, severity, ownership, resolution time, and duplicate visibility.
- Admins need access control, audit logs, retention policies, redaction, SSO, and billing controls.

## Chosen Stack
- Web app: Vue 3 + Vite + TypeScript.
- Extension: WXT + Vue 3 + TypeScript.
- Backend: Hono on Cloudflare Workers.
- Database: Neon Postgres.
- Storage: Cloudflare R2 for videos, screenshots, clips, exports, and thumbnails.
- Async jobs: Cloudflare Queues for AI, notifications, integrations, cleanup, and retry work.
- Edge state: Cloudflare KV or Durable Objects for rate limits, short-lived state, and realtime coordination when needed.

## Product Surfaces

### Browser Extension
The extension is the primary capture interface for internal users.

Capabilities:
- Start screen recording.
- Start live annotation.
- Take quick screenshot.
- See current page issues.
- Open developer overlay.
- Manage recording state.
- Save draft or share issue.
- Send issue to integrations.

### Web Dashboard
The dashboard is the team workspace.

Capabilities:
- Issue inbox.
- Projects and environments.
- Search and filters.
- Assignee, severity, status, labels, and priority.
- Team members and roles.
- Integration settings.
- Issue submission links.
- Analytics and reports.
- Billing and usage.

### Issue Viewer
The issue viewer is the developer-facing evidence page in the main Vue app, typically at `/issue/[id]`.

Capabilities:
- Watch recording.
- Scrub synchronized timeline.
- Inspect console logs, network requests, errors, performance markers, and user actions.
- Video scrubber markers for console errors/warnings and network failures/slow requests; marker click seeks video and selects the matching row; row click seeks video.
- View screenshots and annotations.
- Read AI summary and reproduction steps.
- Comment, mention, assign, update status.
- Send or sync to external tools.

## Extension vs web app review responsibilities
Extension responsibilities:
- Start and stop capture.
- Lightweight post-recording review focused on video, markers, trimming, privacy controls, and minimal metadata editing.
- Save draft and retry uploads.
- After saving a recording issue, open `/issue/[id]` in a new browser tab for full review.

Web app responsibilities:
- Full developer evidence experience: console, network, errors, performance, and user action panels synchronized to video.
- Publishing controls for issue links (private vs public), comments, lifecycle, permissions, and integrations.

Hard rule:
- The extension must not show DevTools-style console/network/error tabs during post-recording review. Those belong in `/issue/[id]`.

### Issue submission links
Issue submission links allow customers or non-technical users to create issues without installing the extension.

Capabilities:
- Public capture link.
- Consent and privacy explanation.
- Screen recording.
- Required context fields.
- Optional site SDK for first-party logs.
- Expiration, max duration, allowed domains, and destination project.
- Every completed submission creates a first-class issue with its own issue link.

## Core Issue Model
An issue is the central unit of work.

Required fields:
- ID.
- Organization ID.
- Project ID.
- Created by.
- Source: extension, issue submission link, dashboard, integration, API.
- Mode: screen recording, live annotation, screenshot, imported.
- Title.
- Summary.
- Status.
- Severity.
- Priority.
- Page URL.
- Environment.
- Browser/device metadata.
- Created timestamp.
- Updated timestamp.

Optional fields:
- Assignee.
- Labels.
- Duplicate group ID.
- External issue links.
- AI confidence values.
- Privacy flags.
- Retention policy.
- Issue link visibility and publish settings.

## Issue links and publishing
Every issue has a stable issue link that opens the issue viewer.

Visibility:
- Private: requires authentication and workspace membership, or a signed viewer token.
- Public: anyone with the link can view the issue page, subject to org policy and optional link protections.

Publishing controls:
- Publish/unpublish toggle.
- Expiration and revocation.
- Optional password protection.
- Optional domain allowlist for embedding or opening.
- Watermarking or download restrictions when needed.

## Issue Lifecycle
Default states:
- Draft: captured locally or server-side but not shared.
- Open: submitted and ready for triage.
- Triaged: severity, owner, and destination confirmed.
- In Progress: developer is working on it.
- Resolved: fix is believed complete.
- Awaiting Verification: QA or reporter should confirm.
- Verified: issue is fixed.
- Reopened: fix failed or bug returned.
- Archived: hidden from active views but retained by policy.

## Evidence Types
The platform should support these evidence types:
- Screen recording.
- Screenshot.
- Screenshot markup.
- Short clip.
- Console logs.
- Network requests.
- JavaScript errors.
- Unhandled promise rejections.
- Performance markers.
- User actions.
- DOM element anchors.
- Browser, OS, device, viewport, timezone, language, network metadata.
- Release, commit, build, feature flag, and environment metadata.
- AI summary.
- AI reproduction steps.
- AI root-cause hints.

## AI Features
AI should be helpful but editable.

Core AI:
- Generate title.
- Generate concise summary.
- Generate reproduction steps.
- Suggest severity and priority.
- Detect duplicates.
- Identify likely root cause.
- Suggest owner, component, labels, and integration fields.
- Generate tracker-ready issue body.

Advanced AI:
- Chat with the issue evidence.
- Explain failed network requests and stack traces.
- Draft Playwright reproduction test.
- Suggest fix verification checklist.
- Compare similar historical issues.

Privacy requirements:
- AI must be opt-in for sensitive workspaces.
- Admins can disable AI.
- Users can review and edit AI output before sharing.
- The product should clearly explain what evidence is sent to model providers.

## Integrations
Priority integrations:
- Linear.
- Jira.
- GitHub Issues.
- Slack.
- Microsoft Teams.
- Sentry.
- Datadog.
- Zendesk.
- Intercom.
- Webhooks.

Integration behavior:
- Create external issue from new capture.
- Send existing issue to external tool.
- Configure fields before sending.
- Include DevProbe issue link and evidence summary.
- Sync status where API support is strong.
- Preserve external issue ID and URL.
- Retry failed integration jobs.

## Security And Privacy
Requirements:
- Private team workspaces by default.
- Public issue links must support expiration and revocation.
- Role-based access control.
- Audit logs for sensitive actions.
- Redaction rules for headers, cookies, tokens, emails, passwords, and payment data.
- Manual and automatic visual blur.
- Retention policies per workspace or project.
- Export and delete controls.
- SSO/SAML for enterprise.
- Clear permission education before browser capture starts.

## MVP Requirements
MVP must include:
- WXT browser extension.
- Vue dashboard and issue viewer.
- Hono API.
- Neon schema for users, orgs, projects, issues, sessions, evidence, timeline events, comments, and integrations.
- R2 upload for videos and screenshots.
- Screen recording up to 5 minutes.
- Live annotation with pins and screenshots.
- Console, network, error, and metadata capture.
- AI title, summary, and reproduction steps.
- Web app issue page at `/issue/[id]` with full evidence panels.
- Extension post-recording review opens `/issue/[id]` after save (no console/network/error tabs in the extension).
- Basic dashboard with search and filters.
- Slack plus one issue tracker integration, preferably Linear or GitHub first.

## Post-MVP: MCP
DevProbe should expose a Model Context Protocol (MCP) interface post-MVP so agents and IDEs can query structured issue evidence with workspace authentication, scoped permissions, and redaction.

MCP goals:
- Fetch issue summaries, timelines, network failures, console errors, stack traces, and attachment metadata.
- Propose tracker updates as structured actions that still require human approval by default.
- Support enterprise policies: disable MCP, allowlist clients, audit every tool call.

## Non-Goals For MVP
- Native mobile app.
- Full observability platform.
- Complete two-way sync for every integration.
- SSO and SCIM.
- Advanced analytics warehouse.
- Full customer support issue submission links unless internal capture is stable.

## Success Metrics
- Screenshot issue can be created and shared in under 60 seconds.
- Recording issue can be created and shared in under 3 minutes.
- Developer follow-up questions are needed for fewer than 30% of submitted issues.
- Upload success rate is above 99% for normal recordings.
- Issue viewer loads in under 2 seconds for common reports.
- At least 50% of team issues are sent to an integration.
- AI summaries are accepted with light editing most of the time.

## Quality Bar
- Non-technical users should understand the next step without documentation.
- Developers should trust that evidence is complete and time-aligned.
- Users should never lose captured work because of upload or network failure.
- Privacy controls should be visible before capture, not hidden after upload.
- The product should feel fast, calm, and professional under pressure.
