# DevProbe — Build Plan

> Phase-by-phase execution tracker. Check off tasks as they land.

---

## Design System

**Feel:** iOS utilitarian — calm, precise, no decoration for decoration's sake.
**Themes:** Dark + Light. Deep neutrals as the chromatic base.
**Fonts:**

- UI: `Inter` (variable, 100–900)
- Code / monospace: `JetBrains Mono` (console logs, network URLs, stack traces, timestamps, IDs)

**Palette (dark base):**


| Token              | Dark      | Light     |
| ------------------ | --------- | --------- |
| `--bg-base`        | `#0a0a0a` | `#f5f5f5` |
| `--bg-elevated`    | `#111111` | `#ffffff` |
| `--bg-overlay`     | `#1a1a1a` | `#f0f0f0` |
| `--bg-subtle`      | `#222222` | `#e8e8e8` |
| `--border`         | `#2a2a2a` | `#d4d4d4` |
| `--border-strong`  | `#3a3a3a` | `#a3a3a3` |
| `--text-primary`   | `#f5f5f5` | `#0a0a0a` |
| `--text-secondary` | `#a3a3a3` | `#525252` |
| `--text-muted`     | `#525252` | `#a3a3a3` |
| `--accent`         | `#3b82f6` | `#2563eb` |
| `--accent-hover`   | `#60a5fa` | `#1d4ed8` |
| `--destructive`    | `#ef4444` | `#dc2626` |
| `--warning`        | `#f59e0b` | `#d97706` |
| `--success`        | `#22c55e` | `#16a34a` |


**Severity colors:**


| Severity | Color     |
| -------- | --------- |
| Critical | `#ef4444` |
| High     | `#f97316` |
| Medium   | `#f59e0b` |
| Low      | `#6b7280` |


**Principles:**

- No shadows unless functionally necessary. Use borders instead.
- Tight spacing: 4px grid. Prefer 8, 12, 16, 24, 32.
- Border radius: 6px components, 8px cards, 12px modals. Never pill buttons.
- Monospace for all technical data: timestamps, URLs, IDs, log messages, code.
- Status chips: small, uppercase, letter-spaced. Not badges — chips.
- Icon set: Lucide (consistent weight 1.5, size 16 in UI, 14 in dense tables).

---

## Stack


| Layer             | Technology                                           |
| ----------------- | ---------------------------------------------------- |
| Web app           | Vue 3 + Vite + TypeScript + Tailwind CSS             |
| Browser extension | WXT + Vue 3 + TypeScript                             |
| API               | Hono on Cloudflare Workers                           |
| Database          | Neon Postgres + Drizzle ORM                          |
| Storage           | Cloudflare R2                                        |
| Async jobs        | Cloudflare Queues                                    |
| Edge state        | Cloudflare KV (rate limits, short-lived state)       |
| AI                | Claude API (Anthropic) via Cloudflare Queue consumer |
| Monorepo          | pnpm workspaces                                      |


---

## Phase 1 — Monorepo Foundation & Infrastructure

> DB schema migrated, auth routes working, R2 + Queues wired.

- BUILDPLAN.md created with design system
- pnpm monorepo scaffold — `apps/web`, `apps/extension`, `packages/api`, `packages/shared`
- `packages/shared` — shared types, Zod schemas, core issue model enums
- `packages/api` — Hono + Wrangler + Drizzle ORM scaffolded
- Neon/Drizzle schema — all tables: orgs, users, memberships, sessions, projects, environments, issues, recording_sessions, annotation_sessions, pins, anchors, timeline_events, attachments, comments, activity_events, integrations, integration_configs, issue_links, ai_outputs, duplicate_groups
- R2 binding + Cloudflare Queues binding wired in wrangler.toml
- Auth routes — `POST /auth/signup`, `POST /auth/login`, JWT middleware
- `apps/web` — Vue 3 + Vite + TypeScript + Tailwind + design tokens
- `apps/extension` — WXT + Vue 3 + TypeScript scaffold

---

## Phase 2 — Web Dashboard (Core Shell)

> Authenticated team can log in, create a project, see the inbox.

- Auth flows — sign up, log in, invite to workspace *(deferred)*
- Pinia auth store + route guards *(scaffold)*
- Dashboard layout — sidebar, top bar, workspace switcher
- Project + environment management *(placeholder)*
- Issue inbox — table view, filters, search, severity/status chips, mock data
- Team + roles — invite by email, RBAC *(deferred)*

---

## Phase 3 — Extension Scaffold + Screenshot Capture

> Screenshot issue created and shared in under 60 seconds.

- [x] WXT manifest V3, content scripts, background service worker
- [x] Extension popup — Screenshot / Annotate / Record actions
- [x] Floating launcher injected into page
- [x] Auth token sync between web app and extension (`externally_connectable` + `/extension/connect` page)
- [x] `chrome.tabs.captureVisibleTab` screenshot capture
- [x] Environment metadata collection (URL, browser, OS, viewport, timezone, build)
- [x] Quick form — title + severity + project
- [x] API routes: `POST /issues`, `POST /attachments`, `GET/POST /projects`
- [x] Upload screenshot + create issue via API
- [x] "View issue" → opens `/issue/[id]` in new tab

---

## Phase 4 — Screen Recording Engine

> Recording issue created and shared in under 3 minutes.

- Pre-flight UX — capture disclosure, privacy controls, Chrome debugger warning
- MediaRecorder API → WebM video capture
- Console capture — injected script overriding `console.`*, `onerror`, `unhandledrejection`
- Network capture — `chrome.debugger` API (opt-in)
- User action capture — clicks, route changes, navigations, scroll, form submits
- Performance markers — PerformanceObserver (LCP, layout shifts, long tasks)
- Manual + automatic markers
- Single timebase — all events store `timestampMs` from recording start (t=0)
- Floating control bar — timer, pause/resume, stop, marker, blur, health
- Keyboard shortcuts
- Post-recording review — video player + lightweight marker ticks (no console/network panels)
- Trim controls
- Chunked/resumable upload → R2 + IndexedDB draft fallback
- Upload progress + retry

---

## Phase 5 — Issue Viewer (`/issue/[id]`)

> Issue viewer loads under 2s; bidirectional video ↔ panel navigation works.

- Video player — custom controls, seek, speed, fullscreen
- Timeline scrubber — layered marker lanes (console errors, network failures, JS errors, manual markers)
- Marker tooltips + click-to-seek
- Marker clustering when zoomed out
- Console panel — level filter, search, expand payloads, copy, row → seek
- Network panel — table view, detail drawer (headers/payload/response/timing), failed filter, copy as cURL, row → seek
- Errors panel — grouped, stack frames, click → seek
- User Actions panel — readable trail, click → seek, delete sensitive entries
- Performance panel — long tasks, layout shifts, LCP, memory
- Issue metadata sidebar — title, summary, severity, priority, status, assignee, labels, environment
- Publishing controls — private/public toggle, expiry, copy link
- Comments + activity log

---

## Phase 6 — Live Annotation

> Pin with comment in under 15s; pins survive scroll and reload.

- Overlay injection — hover highlight, element label tooltip
- Escape to exit, unsaved-pin warning
- Pin placement + element anchoring (selector, XPath, stable attrs, text fingerprint, bounding box)
- Anchor resolution fallback order
- Stale anchor detection + re-anchor UI
- Pin composer — comment, issue type, severity, assignee, labels
- Screenshot attachment + short clip (max 60s)
- Screenshot markup tool — crop, rect, arrow, pen, text, blur, callouts, undo/redo
- Multi-pin session — pin list sidebar, submit each pin as own issue
- Shared review tag for related pins
- Developer overlay mode — show open issues on live page, update status

---

## Phase 7 — AI Features

> AI summaries accepted with light editing for majority of issues.

- `ai-process` Cloudflare Queue consumer
- Generate title, summary, reproduction steps via Claude API
- Suggest severity + priority
- Duplicate detection (URL + error message heuristics + embeddings)
- Root cause hints (explain failed requests + stack traces)
- Suggested integration fields
- Fix verification checklist generation
- AI output panel in issue viewer (editable)
- Workspace AI opt-in/disable toggle
- Evidence transparency display (what was sent to model provider)

---

## Phase 8 — Integrations

> At least 50% of team issues sent to an integration.

- Integration infrastructure — encrypted credentials, `integration-send` queue consumer, retry logic
- Linear OAuth + create issue + status sync via webhook
- GitHub Issues OAuth + create issue + status sync
- Slack workspace OAuth + rich block notifications (new issue, status change, mention)
- Generic webhook handler

---

## Phase 9 — Issue Lifecycle & Collaboration

> Developer follow-up questions needed for fewer than 30% of issues.

- Full lifecycle states — Draft → Open → Triaged → In Progress → Resolved → Awaiting Verification → Verified → Reopened → Archived
- Status transitions with optional comment + activity log
- Fix verification flow + checklist
- Threaded comments — mentions, reactions, assignment notifications
- Issue submission links (customer-facing) — consent screen, web recording, required fields, upload confirm

---

## Phase 10 — Security, Privacy & Polish

> Production-ready.

- Automatic network redaction (Authorization, Cookie, tokens, API keys, passwords, payment data)
- Project-level network capture denylist
- Manual visual blur for video frames + screenshots
- Audit log — view, share, export, delete, integration send, admin changes
- Retention policies per workspace/project
- Export issue bundle (video + evidence JSON)
- Full RBAC — admin/member/viewer/guest
- Signed viewer tokens for private issue links
- Public link protections — expiry, revocation, password, domain allowlist
- Rate limiting via Cloudflare KV
- Light analytics — volume, resolution time, duplicate rate, open/resolved trend
- SSO auth abstraction layer (not wired)

---

## Phase 11 — MCP Interface

> Agents and IDEs can query structured DevProbe evidence.

- MCP server with workspace authentication + scoped permissions
- Tools: fetch issue summary, timeline, network failures, console errors, stack traces, attachment metadata
- Propose tracker updates (human approval required)
- Enterprise controls: disable MCP, allowlist clients, audit tool calls
- Redaction applied to all MCP responses

---

## Architectural Invariants

These must never be violated:

1. **Single timebase** — all timeline events store `timestampMs` from recording start (`t=0`). Network spans store both `startTimestampMs` and `endTimestampMs`.
2. **Extension review hard rule** — no console/network/error DevTools-style tabs in the extension. Full correlation UI lives exclusively in `/issue/[id]`.
3. **AI is opt-in** — workspace AI toggle; user can edit all AI output; never silently send evidence to model provider.
4. **Privacy before upload** — blur and redaction happen client-side before any data leaves the browser.
5. **Draft durability** — local `IndexedDB` draft is never deleted until server confirms successful upload.

