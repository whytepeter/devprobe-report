# DevProbe — Handoff

_Last updated: 2026-05 · branch `annotation` (live-annotation work, uncommitted) on top of `dev`._

DevProbe is a bug-reporting platform: a Chrome (WXT) extension captures bugs three
ways — **screenshot**, **screen recording**, **live annotation (pins)** — and a Vue
web app (`apps/web`) lets teams triage them. API is Hono on Cloudflare Workers
(`packages/api`), Neon Postgres via Drizzle, R2 for blobs, Cloudflare Queues for
async jobs.

```
apps/extension   WXT + Vue 3 — popup, background SW, content script, offscreen doc
apps/web         Vue 3 + Vite + Pinia + TanStack Query
packages/api     Hono on CF Workers — routes, Drizzle schema, queues
packages/shared  Zod schemas + types shared across runtimes
packages/ui      shadcn-vue component library (reka-ui + CVA)
```

Dev servers: API on `:8787` (`pnpm --filter @deveprobe/api dev`), web on `:5173`
(`pnpm --filter @deveprobe/web dev`).
**Extension: always `pnpm --filter @deveprobe/extension build` (production), then
reload at `chrome://extensions`.** Never `wxt dev` — it bakes an HMR websocket
client (`ws://localhost:3002`) into the bundle that errors on every page.

---

## Git state

- `dev` → `ab95e6b` "Major feature pass: issue page redesign + bulk actions + recording polish" (pushed).
- `annotation` → branched from `dev`, has `37e6e6c` + **uncommitted live-annotation + recording-transform work** (see below). Not yet merged to `main`.
- **Rule (in `.wolf/cerebrum.md`): never create a git worktree — always work directly on the branch.**

### Uncommitted on `annotation` (this session)
```
NEW  packages/api/src/routes/annotation.ts          grouped-pin API
NEW  apps/extension/src/lib/recording-state.ts       FAB↔recorder bridge
NEW  apps/web/src/features/issues/composables/useIssuePins.ts
NEW  apps/web/src/features/issues/components/IssuePinList.vue
NEW  apps/web/src/features/issues/lib/inline-markdown.ts
MOD  apps/extension/src/lib/annotation-state.ts      FAB↔overlay bridge
MOD  apps/extension/src/components/capture/annotation/* (Overlay/Pin/Composer/Detail)
DEL  apps/extension/src/components/capture/annotation/AnnotationToolbar.vue
MOD  apps/extension/src/components/launcher/FloatingLauncher.vue
MOD  apps/extension/src/components/capture/recording/toolbar/RecordingControlBar.vue
MOD  apps/extension/src/entrypoints/content.ts
MOD  apps/extension/src/lib/api.ts
MOD  apps/web/src/features/issues/components/PinView.vue
MOD  packages/api/src/index.ts  (mounts /annotation)
```
`pnpm --filter @deveprobe/api build`, `… web build`, and `… extension build` all
pass clean as of this writing.

---

## What shipped on `dev` (committed)

### Web — issue page redesign
- `IssuePage.vue` is a thin orchestrator: top bar (`IssueDetailHeader`) + a
  mode-specific HERO view + shared shell (`IssueUrlLine`, `IssueTitleBlock`,
  `IssueDetailsCard`, `IssueActivity`).
- HERO views: `ScreenshotView`, `PinView`, `RecordingView` — exactly one renders
  per `issue.mode`.
- `RecordingView` → custom player (`RecordingVideoPlayer` + `usePlayback` +
  `RecordingVideoTimeline` w/ error markers + `RecordingVideoControls`) and a
  **side panel** (`recording/RecordingSidePanel` → Info/Console/Network/Actions
  tabs, each a folder with its own filter composable). The side panel renders at
  the page level as a sibling of the article column (not inside the video card).
- `IssueDetailHeader`: workspace breadcrumb + mode-tinted identity chip (status |
  severity), AUTO-watching pill (recording only), MCP-live / Send / Share.
- `IssueDetailsCard`: real Status / Severity / Assignee `Select`s + inline tag
  input → all via `useUpdateIssue` (TanStack mutation).
- Multi-select + bulk actions: hover checkbox on `IssueCard`, floating
  `IssuesBulkBar` (set status / move to folder / delete), `useIssueSelection`.
- Drag issues → folders: cards `draggable`, sidebar folders are drop zones →
  `POST /issues/bulk` (`useBulkUpdateIssues`).
- Skeletons: `IssueCardSkeleton` (matches the 4-col grid), `IssuePageSkeleton`.
- **TanStack Query** registered in `main.ts`; `useIssue`, `useIssueEvents`,
  `useIssuePins`, `useWorkspaceMembers` use `useQuery`; mutations in
  `useIssueMutations`.
- Avatar palette refreshed to clean `-500` tones + definition ring.

### API (on dev)
- `PATCH /issues/:id`, `DELETE /issues/:id`, `POST /issues/bulk`
- `GET /auth/workspace/members` (assignee dropdown)
- R2 multipart: `attachment_status` enum + `r2_upload_id` col; initiate/part/
  complete/abort routes.

### Extension (on dev)
- Offscreen recording host with multi-segment + reload-recovery contract.
- Sticky element-blur (`lib/element-blur.ts`): pick mode persists across clicks.
- AI generate + Download consolidated into `PostComposeModal`.
- `useRecordingSubmit` composable owns the recording→issue upload pipeline
  (draft → createIssue → R2 multipart segments → events → open issue).

---

## What this session added (uncommitted on `annotation`)

### 1. Live annotation — GROUPED model
**Key decision (user):** a pin is NOT its own issue. **One review session = one
issue; pins are child rows.** Persistence is **live on the first pin**; the issue
title is **prompted on submit**.

```
annotation_session  (1 per sitting; existing table)
   └── issue         (1, mode=live_annotation, dashboard-visible)
        └── pins[]    (each: comment, severity, issueType, status, anchor)
```

**API — `packages/api/src/routes/annotation.ts`** (mounted at `/annotation`):
- `POST /annotation/pins` — first pin (omit session/issue) lazily creates the
  session + grouping issue and returns their ids; later pins reuse them.
- `PATCH /annotation/pins/:id` — status / comment / severity / anchor (org-scoped
  via the pin's session).
- `DELETE /annotation/pins/:id`.
- `GET /annotation/pins?pageUrl=` (overlay) `| ?issueId=` (web issue page).
- `POST /annotation/sessions/:id/submit` — sets the grouping issue's title (+
  summary), marks session submitted.
- Uses existing `annotation_sessions` + `pins` tables — **no migration**.

**Extension overlay — `components/capture/annotation/`:**
- `AnnotationOverlay.vue` — orchestrator. Two modes: `view` (page fully
  interactive, overlay root `pointer-events:none`) and `place` (click-capture
  layer + hover highlight + drop pin).
- `lib/anchor.ts` — `describeAnchor()` (stable-attr → CSS selector → bbox + click
  offset %) and `resolveAnchor()` (re-find element). Pins re-position on
  scroll/resize by re-resolving the element (rAF-throttled `viewportTick`);
  stale (unresolvable) pins fall back to stored doc-coords and are flagged.
- `AnnotationPin.vue` — marker colored by **status** (open/in-progress/resolved…),
  dashed amber + badge when stale.
- `AnnotationPinComposer.vue` — inline popover: comment (mini-markdown toolbar:
  bold/italic/**link via custom popover, not window.prompt**/image), severity
  pills, issue-type `Select`. Dropdowns portal into the popover's own root so
  they render above it.
- `AnnotationPinDetail.vue` — read popover: comment, status `Select` (inline
  change → recolors marker), **Re-anchor** button when stale, View-issue link.
- Cover screenshot: on the FIRST pin (before marker/composer paint) a **clean**
  viewport screenshot is captured (overlay chrome hidden) and uploaded to the
  grouping issue as the cover.

**Web — pin rendering on the issue page:**
- `PinView.vue` → cover image + "Pinned on <page>" banner + `IssuePinList`.
- `IssuePinList.vue` — numbered, status-colored, comment rendered via
  `lib/inline-markdown.ts` (safe: escapes first, re-introduces only links
  (http/https/mailto)/bold/italic/code), severity/type/status chips.
- `useIssuePins(issueId)` — TanStack query over `GET /annotation/pins?issueId=`.

### 2. FAB is the single control surface (transforms by mode)
The `FloatingLauncher` (FAB) drag/click are **decoupled**: click toggles the
menu; a **grip handle** appears on hover (left of the FAB) and is the only drag
affordance. Position persists to `localStorage` (`dp_fab_pos`).

- **Annotating** (`lib/annotation-state.ts`): FAB → map-pin + pin-count badge;
  menu offers Start/Cancel pinning, **View pins** (in-popover list w/ filter +
  back button; clicking a pin jumps + keeps the list open), Done (finish dialog
  prompts the review title). Attention pulse on activation.
- **Recording** (`lib/recording-state.ts`, NEW this session): FAB → the recording
  **toolbar pill** (timer + pause/resume + blur + stop), anchored at the FAB
  position with the drag handle intact. `content.ts` owns the recorder
  (capture-streams, timer, element-blur) and watches the launcher's intents;
  `RecordingControlBar.vue` is now position-agnostic (the launcher places it).
  The pill width is measured and clamped (`anchorLeft`) so a bottom-right FAB
  doesn't push it off-screen.
- `page-probe` (MAIN-world console/network/history wrapper) is injected at
  **recording-start only** (privacy: no capture on idle/annotation pages), via
  `chrome.scripting.executeScript` from the background.

---

## Known gaps / next priorities

Per `LIVE_ANNOTATION_SPEC.md` audit — done: quick-pin, multi-pin grouping,
anchoring (stable-attr/selector/bbox), composer (comment/severity/type/links),
re-position on scroll, stale-pin UI + re-anchor, status-driven colors + inline
status change, pin list, cover. **Not yet built:**

1. **Composer fields**: assignee + labels on a pin (mutation paths exist).
2. **Developer overlay**: popup "N issues on this page" + one-click overlay of
   existing pins for inspection.
3. **Anchoring depth**: XPath, text-fingerprint, ancestor-fingerprint (v1 has
   stable-attr + selector + bbox only).
4. **Screenshot markup** tools on annotation pins (exist for the screenshot flow,
   not wired into pins); **short clip** per pin.
5. **Threaded comments / mentions / reactions** per pin; **AI** (type/severity
   suggestion, title gen, duplicate detection, multi-pin summary).
6. **Duplicate warning** + **public-link publish warning** before submit.
7. Web issue page: render pins **overlaid on the cover** (currently a list).
8. **Multipart real upload progress** is phase-only in some paths.

## Parked from earlier (still open)
- AI title/summary wiring (the Regenerate button is a stub).
- Privacy: per-project denylist for domains/headers/body; sensitive-field auto-blur.
- Recording failure-recovery UI (retry + download draft) on the issue page.

---

## Gotchas / conventions (see `.wolf/cerebrum.md` for the full list)
- shadcn `Select` works in shadow DOM **only** via the `:to` portal prop — point
  it at the component's own root (shares stacking context + theme vars).
- Shadow-DOM overlays: host `pointer-events:none`, opt interactive children back
  in with `pointer-events:auto`. Annotation host sits at z `2147483646`, the FAB
  launcher at `2147483647` so the FAB stays clickable above the overlay.
- `var(--accent)` / `var(--border)` are raw HSL components (for `hsl(var(...))`),
  not usable directly — use `--accent-hex` etc.
- Router: `apps/web/src/app/router.ts` maps `/issue/:id` → `features/issues/IssuePage.vue`.
- Pin anchor lives in the `pins.anchor` jsonb column (GROUPED model); the earlier
  per-issue `browserMeta.anchor` is legacy.
- Content script: register all `chrome.runtime.onMessage` listeners synchronously
  before any `await` in `main()`, or messages sent during init are dropped.
