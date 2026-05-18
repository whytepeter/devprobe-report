# DevProbe — Session Handoff

> **Branch:** `dev` (single commit `398e1e0` "Add screen recording compose components" + a large pile of uncommitted work)
> **Last build:** Chrome extension built clean. Web app dev-server reloads from source.
> **Last action:** Mid-refactor — moving the screen-recording `MediaRecorder` into a chrome offscreen document so it survives captured-tab reloads. See **§ Open work in flight**.

---

## 1. What DevProbe is

A premium bug-reporting platform that turns messy user feedback into complete, actionable engineering tickets. Capture once, debug immediately, route automatically, verify confidently.

Monorepo:
- `apps/extension/` — WXT + Vue 3 Chrome MV3 extension (capture UX)
- `apps/web/` — Vue 3 + Vite (dashboard + issue viewer)
- `packages/api/` — Hono on Cloudflare Workers + Neon Postgres + R2
- `packages/shared/` — TS types + Zod schemas
- `packages/ui/` — shadcn-vue components (Tailwind tokens)

Specs that drive scope (read these before deep work):
- `GENERAL_SPEC.md`
- `SCREEN_RECORDING_SPEC.md`
- `LIVE_ANNOTATION_SPEC.md`

---

## 2. How to run locally

```bash
# Install
pnpm install

# Web (Vite, port 5173)
pnpm --filter @deveprobe/web dev

# API (wrangler, port 8787). Requires packages/api/.dev.vars with DATABASE_URL + JWT_SECRET.
pnpm --filter @deveprobe/api dev

# Extension — BUILD, do not run a dev server. (User preference, recorded in
# .wolf/cerebrum.md.) Then "Load unpacked" from apps/extension/.output/chrome-mv3/
pnpm --filter @deveprobe/extension build
```

The web app's Vite proxy forwards `/api/*` → `http://localhost:8787`. Both must be running for login + issue creation.

---

## 3. Extension architecture

Multiple MV3 contexts:

| Context | File | Lifecycle | Purpose |
|---|---|---|---|
| Popup | `entrypoints/popup/*` | Per click | Capture launcher (Screenshot / Annotate / Record), account menu |
| Background SW | `entrypoints/background.ts` | Ephemeral | API proxy (CORS), tab + offscreen lifecycle, message hub |
| Content (isolated) | `entrypoints/content.ts` | Per page | Mounts FAB + region selector + screenshot/recording compose modals via shadow DOM. Hosts the floating recording toolbar |
| Content (MAIN world) | `entrypoints/page-probe.content.ts` | Per page, `document_start` | Monkey-patches `fetch`/`XHR`/`console`/`history` in the page's own JS world; posts events via `window.postMessage` |
| Offscreen | `entrypoints/offscreen/*` *(in progress)* | Lives until closed | Owns the `MediaRecorder` so recording survives captured-tab reloads |

Why so many contexts? Each one observes things the others can't:
- Page's real `window.fetch` → needs MAIN world (content scripts run in isolated world)
- Long-lived MediaRecorder → needs offscreen (content scripts die on reload)
- API calls with `chrome-extension://` origin → needs background (content scripts inherit page origin)

---

## 4. What's done (recent session, not yet committed)

### Folder reorg
- `apps/extension/src/components/capture/recording/` →
  ```
  recording/
    RecordingCapture.vue         orchestrator → PostComposeModal
    RecordingPanel.vue           thin coordinator
    RecordingVideo.vue           <video> + overlays
    types.ts, utils.ts
    useRecordingPlayback.ts      composable
    timeline/
      RecordingTimeline.vue      waveform + trim handles
      RecordingMarkerTooltip.vue
    toolbar/
      RecordingControlBar.vue    floating bar during capture
      RecordingControls.vue      review-mode controls
  ```
- New shared `apps/extension/src/components/capture/ComposeHeading.vue` (top bar — recording + screenshot share it).

### Compose modal (review screen)
- Light + dark theme, follows system preference via `applyThemeClass()`.
- Timeline trimmer with two violet drag handles + grabbable playhead knob.
- Marker tooltips: dark pill with `[Network|Error|Warning]` badge + label + time + "click to seek".
- AI button state machine: `Generate` → `Generating ···` → `Regenerate`.
- "Create issue & copy link" submit; visibility dropdown portals to the closest `.dark`/`.light` ancestor so themes cascade.
- Form: TITLE, DESCRIPTION, SEVERITY (dark-filled selected), TAGS (chip + dashed "+ add").

### Capture pipeline
- **page-probe (MAIN world)** — patches `fetch`, `XMLHttpRequest`, `console.{log,info,warn,error,debug}`, `history.pushState/replaceState`, `popstate`. Posts redacted events back via `postMessage`.
- **capture-streams (isolated)** — subscribes to page-probe events + listens to `window.error`, `unhandledrejection`, clicks. Produces two arrays in `stop()`:
  - `markers` — trimmer-visible subset (errors + warnings + network_fail + network_slow + navigations)
  - `events` — full stream (uploaded to `/issues/:id/events` for the issue page)
- **redact.ts** — strips ~17 sensitive query-param names, masks credit-card-shaped numbers, never captures input values (`redactClickTarget` returns `"[password field]"` / `"[payment field]"` / `input[<label>]`).

### Floating recording toolbar (`RecordingControlBar.vue`)
- Backdrop-blurred dark pill, bottom-center
- Pulsing red dot · timer (mm:ss) · pause/resume · blur · stop
- No "Recording / Paused" text label per design

### Element blur (`element-blur.ts`)
- Click "blur" on the toolbar → hover any element with violet bounding-box highlight → click to apply `filter: blur(10px)` directly on that element.
- Scrolls with content (CSS filter on element, not a fixed overlay).
- Click an already-blurred element to unblur. Esc cancels.
- All blurs restored when recording stops.

### Backend — timeline events
- New route: `POST /issues/:id/events` (`packages/api/src/routes/issues.ts`)
- Body: `{ events: TimelineEvent[], pageUrl?, durationMs?, startedAt?, stoppedAt? }`
- Lazy-creates a `recording_sessions` row on first call, bulk-inserts events with validation (drops malformed rows, caps batch at 5000, clamps `timestampMs ≥ 0`).
- Schema: `timeline_events` table already existed (kind enum: console / network / error / user_action / performance / marker / navigation).

### Client API
- `api.uploadAttachment` now has `maxRetries` + `onPhase` (`encoding | uploading | finalising`).
- `api.uploadTimelineEvents({ issueId, events, ... })` — chunks 500 events/request.

### Local draft persistence
- `apps/extension/src/lib/recording-drafts.ts` — IndexedDB store (`devprobe` DB, `recording-drafts` object store).
- On submit: save the Blob + form snapshot BEFORE upload. Delete only after server-confirmed success. On failure, the draft persists so user can retry.

### Issue card thumbnails
- `apps/web/src/features/dashboard/components/IssueCard.vue` renders a `<video>` poster frame for recording issues (calls `primePoster` on `loadedmetadata` to force the browser to paint the first frame).
- Hero on `/issue/[id]`: `IssueMedia` picks video for recordings, image for screenshots.

### Misc fixes
- **`Infinity:NaN` timer** → `formatTime/formatDuration` coerce non-finite to 0; seek math uses known `durationMs` (not `video.duration`, which is `Infinity` for MediaRecorder WebM until played).
- **Popup instant render** → `usePopupAccount` reads auth + cached `me` from `chrome.storage` (fast); fires `api.me()` non-blockingly; gates UI behind `initialised` so no Connect↔Action flicker.
- **Tab capture (no picker)** → `tabCapture` permission added; popup → background mints stream ID → content script consumes via legacy `chromeMediaSource:'tab'` constraint. Falls back to `getDisplayMedia` if it fails.
- **GraphQL error detection** — page-probe inspects JSON responses for top-level `errors[]`, surfaces each as an `error` marker `"GraphQL: <message>"`.
- **`beforeunload` guard** during recording — user gets the native "Reload site?" confirmation.

---

## 5. ⚠️ Open work in flight — offscreen recording refactor

**Why:** the `MediaRecorder` currently lives in the content script's JS context. Chrome destroys that context on every navigation/reload, so:
- The floating toolbar disappears
- The "Stop" button in the popup goes nowhere (nothing to stop)
- The recording is lost

**The fix:** move the `MediaRecorder` into a hidden chrome offscreen document, which **does** survive captured-tab reloads. Content scripts become thin clients (toolbar UI + per-page capture-streams) that re-mount on each new page when the persisted `dp:recording` flag is present.

### ✅ Done
- `wxt.config.ts` — `offscreen` permission added.
- `apps/extension/src/entrypoints/offscreen/index.html` — minimal HTML host.
- `apps/extension/src/entrypoints/offscreen/main.ts` — **full** MediaRecorder host. Owns the stream, picks the mime, ticks 250ms chunks, base64-encodes the blob on `stop()` and broadcasts `OFFSCREEN_BLOB` via `chrome.runtime.sendMessage`. Listens for `START_OFFSCREEN | PAUSE_OFFSCREEN | RESUME_OFFSCREEN | STOP_OFFSCREEN`.
- `apps/extension/src/entrypoints/background.ts` — added:
  - Helpers: `hasOffscreenDocument`, `ensureOffscreenDocument`, `closeOffscreenDocument`, `setRecordingState`, `getRecordingState`.
  - Handlers: `START_RECORDING_FLOW`, `RECORDING_COMMAND` (`pause`/`resume`/`stop`), `GET_RECORDING_STATE`, `OFFSCREEN_BLOB`, `OFFSCREEN_ERROR`, `OFFSCREEN_READY`.
  - On `OFFSCREEN_BLOB`: closes the offscreen doc and forwards `RECORDING_FINALISED { base64, durationMs, ... }` to the original captured tab's content script.

### ⏳ NOT DONE — pick up here

1. **`apps/extension/src/entrypoints/content.ts`** — currently a 555-line monolith that still owns the full inline recording lifecycle (`startRecording`, `togglePause`, `stopRecording`, `acquireTabStream`, `recorder.onstop`, etc.). All of that should be DELETED. The new content script needs to:
   - On init: send `GET_RECORDING_STATE` to background. If a state comes back, immediately mount `RecordingControlBar` + start a fresh `capture-streams` (per-page; events from before the reload are lost in v1).
   - Listen for `RECORDING_STARTED { startedAtEpoch }` from background → mount toolbar + capture-streams.
   - Listen for `RECORDING_FINALISED { base64, mimeType, durationMs, startedAtEpoch, stoppedAtEpoch, pageUrl }` from background → decode base64 → `new Blob([bytes], { type: mimeType })` → `URL.createObjectURL` → call existing `openRecordingModal` (rename/refactor as needed).
   - Toolbar callbacks → `chrome.runtime.sendMessage({ type: 'RECORDING_COMMAND', command: 'pause'|'resume'|'stop' })`.
   - Keep `startRegionSelect`, `openCaptureModal` (screenshot flow) intact.

2. **Timebase for cross-page capture-streams.** Currently `performance.now() - startedAt` (page-local). After a reload, `performance.now()` resets to 0 on the new page. Either:
   - Pass `startedAtEpoch` into `startCaptureStreams(startedAtEpoch)` and use `Date.now() - startedAtEpoch` (simple, accurate).
   - Or accept events from the new page have a fresh timebase (lossy but easier).
   Recommended: pass the epoch. One-liner in capture-streams.

3. **Popup `RecordingActiveView` Stop button.** Currently sends `FORWARD_TO_CONTENT { type: 'STOP_RECORDING' }`. Change to direct `chrome.runtime.sendMessage({ type: 'RECORDING_COMMAND', command: 'stop' })` — no need to route through a content script anymore since background owns the lifecycle.

4. **`useRecordingStatus`** composable (popup) — confirm it reads `dp:recording` from `chrome.storage` (the key the background now sets). Should already work since the key name matches.

5. **Build + smoke test:**
   - Start record from popup → toolbar appears, no picker, recording starts
   - Reload the captured tab → toolbar re-appears, recording still going
   - Navigate to a different URL within the tab → toolbar re-appears
   - Click Stop in toolbar → review modal opens with the full blob
   - Click Stop in popup → same outcome
   - Click "Stop sharing" in Chrome's native bar → review modal opens

6. **Optional polish (defer if pressed for time):** events from PREVIOUS pages survive reload. Strategy:
   - Each page's `capture-streams` periodically flushes to `chrome.runtime.sendMessage({ type: 'BUFFER_EVENTS', events })`.
   - Background appends them to an in-memory array (cleared on `OFFSCREEN_BLOB`).
   - On `RECORDING_FINALISED`, background includes the accumulated events alongside the blob.

---

## 6. Spec coverage vs deferred

### Pulled forward (done)
- Pre-flight UX (native browser screen-share prompt is the consent step; tab-capture skips it)
- Floating capture controls (timer, pause/resume, stop, blur)
- 5-min auto-stop cap
- Hide FAB during capture so it doesn't appear in the video
- Single timebase for events (ms from recording start)
- Capture: console (all 5 levels), network (fetch + XHR + GraphQL errors), errors, user actions, navigations
- Privacy: redact sensitive query params, never capture request/response bodies or headers, mask credit-card-shaped numerics, password/payment fields → `[password field]` / `[payment field]`
- Local draft (IndexedDB) preserved until server-confirmed success
- Retry-with-backoff on attachment upload (single-shot, multipart NOT done)
- Timeline events persistence via `POST /issues/:id/events`
- Element-targeted blur (CSS `filter:blur` on the element, scrolls with content)

### Parked / not yet started
- **R2 multipart upload** — user explicitly told me to park this earlier in the session. Plan was drafted (schema: `attachment_status` enum + `r2UploadId` column; 4 new routes: initiate / uploadPart / complete / abort; client `uploadAttachmentMultipart`; RecordingCapture byte-level progress). Resume here after the offscreen refactor lands.
- **Issue details page synced panels** — User explicitly said "leave the issue details page for now... just make sure the details are being saved." Saving is done; rendering (console / network / errors / user-actions tabs with click-to-seek-the-video) is the next big web-app feature.
- **Real upload progress (% bytes)** — currently phased ("Encoding…" → "Uploading…" → "Finalising…"). Byte-level needs XHR or fetch streaming. Will fall out naturally from the multipart work.
- **Failure-recovery UI** — Retry button + "Download recording" link + draft listing in popup.
- **AI title/summary/repro** — `Regenerate` button exists with `Generating →···` state; backend queue not yet wired.
- **Performance markers** (long tasks, layout shifts, LCP) — user requested these NOT be markers on the trimmer. They could still be saved server-side for the Performance panel on `/issue/[id]` if useful.

### Privacy items still to consider
- Per-project denylist for domains/headers/body fields (spec § Privacy And Security).
- Sensitive-form-field masking based on `autocomplete` attribute beyond what `redactClickTarget` covers.
- Audit events for view / share / export / delete / integration-send.

---

## 7. Known bugs / open issues

| # | Bug | Status |
|---|---|---|
| 1 | Toolbar disappears on captured-tab reload | **In flight** — offscreen refactor (see § 5) |
| 2 | Popup Stop button doesn't stop or open modal | **In flight** — fixes itself once § 5 lands |
| 3 | Web app build fails typecheck (`CreateProjectSchema` / `Project` removed from shared but `CreateProjectDialog.vue` still imports them) | **Pre-existing.** Doesn't block dev server. Either delete the dead Projects page or restore the exports. |
| 4 | `wxt` is on v3.x; warning that v4 is out. Cosmetic. | Defer |

---

## 8. Conventions worth knowing (`.wolf/cerebrum.md`)

- **Always modularise large component files.** Each visual region in its own file. Avoid 500-line Vue files.
- **Use semantic tokens** (`bg-card`, `text-foreground`, `border-border`) so `.dark` cascade works. Use solid-colour + opacity (`bg-red-500/10`) for accent pills that need to read on both themes.
- **Tailwind `darkMode: 'media'`** in extension because the `.dark` class strategy doesn't propagate across shadow-root boundaries via prefers-color-scheme alone. Themes are forced by calling `applyThemeClass(container, theme)` on each shadow root.
- **Modals teleport content (SelectContent) via the `:to` prop.** The portal target must be inside the themed ancestor — `IssueComposePanel` walks up from `rootEl` to find the nearest `.dark`/`.light` ancestor.
- **Recording compose modal can ONLY show warnings + errors on the trimmer** (`error`, `warning`, `network_fail`, `network_slow`, `navigation`). Console logs, clicks, performance markers, etc. are saved but NOT visualised. Per explicit user direction.
- **No `chrome.storage` for blobs** — use IndexedDB (`recording-drafts.ts` does).
- **Background SW message size** — Chrome runtime.sendMessage ~64 MB cap. Base64 encoding adds 33%, so a 30 MB blob → 40 MB encoded. Multipart upload will fix this.
- **Page probe content scripts** — only this entrypoint has `world: 'MAIN'`. It can't import from `/lib/` directly (different bundle); a narrow copy of `redact.ts` is inlined.

---

## 9. File map (key files only)

```
apps/extension/
  wxt.config.ts                                       MV3 manifest (perms: tabCapture, offscreen, debugger, …)
  src/
    entrypoints/
      background.ts                                   API proxy + offscreen lifecycle + message hub
      content.ts                                      [needs slimming, see §5] FAB + region select + screenshot/recording modals
      page-probe.content.ts                           MAIN-world fetch/XHR/console/history patches
      offscreen/
        index.html                                    Offscreen host page
        main.ts                                       MediaRecorder owner (NEW)
      popup/
        App.vue, main.ts
        components/{ActionList,ActionItem,AccountMenu,PopupHeader,RecordingActiveView}.vue
        composables/{usePopupAccount,useRecordingStatus}.ts
    components/
      capture/
        PostComposeModal.vue                          shared modal shell (used by screenshot + recording)
        ComposeHeading.vue                            shared heading row
        IssueComposePanel.vue                         right-side form (title/description/severity/tags)
        RegionSelector.vue                            drag-to-select rectangle (screenshot)
        screenshot/                                   ScreenshotCapture, ScreenshotPanel, annotation/*
        recording/
          RecordingCapture.vue                        orchestrator
          RecordingPanel.vue                          coordinator (video + toolbar + timeline)
          RecordingVideo.vue                          <video> + overlays
          useRecordingPlayback.ts                     playback state composable
          types.ts, utils.ts
          timeline/RecordingTimeline.vue              waveform + trim handles + tooltip
          timeline/RecordingMarkerTooltip.vue
          toolbar/RecordingControls.vue               review-mode controls
          toolbar/RecordingControlBar.vue             floating capture-time controls
      launcher/
        FloatingLauncher.vue                          page FAB
        LauncherItem.vue, ConnectPrompt.vue
    lib/
      api.ts                                          { me, createIssue, uploadAttachment, uploadTimelineEvents }
      auth.ts, env.ts, extension.ts, theme.ts, metadata.ts
      capture-streams.ts                              event collection during recording
      element-blur.ts                                 element-targeted blur picker
      page-probe-payload.ts                           message contract for page-probe ↔ capture-streams
      recording-drafts.ts                             IndexedDB local-draft store
      redact.ts                                       URL / click / console arg redaction

apps/web/
  src/
    features/issues/components/{IssueMedia,IssueMediaImage,IssueMediaVideo,IssueAttachments,…}.vue
    features/dashboard/components/IssueCard.vue       grid card with video poster thumbnails
    pages/issues/Issue.vue                            /issue/[id]

packages/api/
  src/
    db/schema.ts                                      drizzle schema (timeline_events, recording_sessions, attachments)
    routes/
      issues.ts                                       … includes POST /:id/events  (NEW)
      attachments.ts                                  single-shot upload (multipart pending)
      auth.ts, folders.ts, projects.ts
    queues/handlers.ts                                AI / integration / notification queues (placeholders)
```

---

## 10. Quick smoke test (after offscreen refactor lands)

1. `pnpm install`
2. Start API: `pnpm --filter @deveprobe/api dev` (needs `packages/api/.dev.vars`)
3. Start web: `pnpm --filter @deveprobe/web dev` (5173)
4. Build extension: `pnpm --filter @deveprobe/extension build`
5. `chrome://extensions` → Load unpacked → `apps/extension/.output/chrome-mv3/`
6. Login from web app → handoff token → extension popup shows Account
7. Click **Record** in the popup → toolbar appears on the active tab (no picker)
8. Type something into a form field — verify your console doesn't reveal the value
9. Reload the page — toolbar should re-appear, recording continues
10. Stop from popup OR toolbar → compose modal opens with the full video
11. Submit → check the issue page on web; recording video plays; `recording_sessions` + `timeline_events` rows exist in Neon

---

*Generated mid-session, after substantial work on capture pipeline + privacy + draft persistence + offscreen refactor. The offscreen refactor's content-script half (§ 5.1) is the immediate next step.*
