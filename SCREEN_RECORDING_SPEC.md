# Screen Recording Spec

## Summary
Screen recording captures a bug as it happens, including video, user actions, console logs, network activity, JavaScript errors, performance markers, and environment metadata. The result should be a developer-ready **recording issue** that explains what happened, when it happened, and why it may have happened.

Every completed screen recording submission creates a first-class issue with its own issue link, which can be published publicly or kept private by policy.

Recording is for broken flows, intermittent bugs, customer issues, network failures, crashes, confusing UX, and anything that needs a timeline.

## Primary Goals
- Capture a complete bug report without asking the user to manually document every detail.
- Synchronize video with console, network, errors, performance, and user actions.
- Make recording feel safe, obvious, and recoverable.
- Let the user review, trim, annotate, and share quickly.
- Preserve local work if upload fails.
- Produce an issue that can be sent to Linear, Jira, GitHub, Slack, or shared by link.

## User Personas
- QA tester recording a broken flow.
- Developer capturing a bug during local testing.
- Product manager reporting confusing behavior.
- Support teammate reproducing a customer issue.
- External customer using a public issue submission link.

## Entry Points
- Extension popup: Start recording.
- Floating launcher: Record bug.
- Keyboard shortcut.
- Dashboard issue submission link.
- Customer issue submission link.
- Issue viewer: Record follow-up.

## Recording Modes

### Extension Recording
For internal authenticated users.

Capabilities:
- Screen or tab recording.
- Console capture.
- Network capture.
- JavaScript error capture.
- User action capture.
- Performance markers.
- Optional microphone.
- Optional tab audio.
- Local review and edit.
- Direct integration send.

### Public issue submission link
For external users without the extension.

Capabilities:
- Browser screen capture through web APIs.
- Consent screen.
- Required fields.
- Optional site SDK logs on owned domains.
- Upload confirmation before submit.
- Limited duration.
- No workspace access.
- Creates a first-class issue with its own issue link, which can be published publicly or kept private by policy.

### Instant Replay
Future mode for capturing what just happened.

Capabilities:
- Rolling local buffer of recent video and events.
- User clicks "Save last 60 seconds".
- Converts buffer into normal issue draft.
- Requires careful browser and storage constraints review.

## Pre-Flight UX
Before recording starts, the user should understand what will happen.

Pre-flight checklist:
- What will be captured: screen, console, network, errors, user actions, device metadata.
- What will not be captured unless enabled: microphone, tab audio, typed sensitive values.
- Privacy controls: blur area, pause, stop, redact network data.
- Browser permission explanation.
- Chrome debugger banner explanation when network capture is enabled.
- Max duration and storage warning.
- Destination: save draft, private issue link, public issue link, or selected integration.

Required buttons:
- Start recording.
- Change capture settings.
- Cancel.

## Capture Controls
The floating recording control should be visible and calm.

Controls:
- Timer.
- Pause/resume.
- Stop.
- Add marker.
- Hide/show control.
- Blur area.
- Mute/unmute microphone when enabled.
- Recording health indicator.

Keyboard shortcuts:
- Start/stop recording.
- Pause/resume.
- Add marker.
- Toggle blur mode.
- Cancel with confirmation.

States:
- Preparing.
- Recording.
- Paused.
- Stopping.
- Processing.
- Review.
- Uploading.
- Shared.
- Failed.
- Draft saved.

## Video Capture
Requirements:
- Default max duration: 5 minutes for free/MVP.
- Configurable max duration by plan.
- Capture selected tab, window, or full screen where browser APIs allow.
- Show cursor trail and click indicators.
- Avoid recording extension overlay controls by default where possible.
- Record at practical quality with bounded file size.
- Store locally until upload succeeds.
- Generate thumbnail after capture.
- Support trim before upload.

Output:
- WebM where browser support is strong.
- Metadata includes duration, resolution, frame rate estimate, size, codec, and capture source.

## Console Capture
Capture:
- log.
- info.
- warn.
- error.
- debug.
- table where possible.
- uncaught exceptions.
- unhandled promise rejections.

Fields:
- Timestamp relative to recording start.
- Level.
- Message.
- Arguments.
- Stack trace when available.
- Source URL.
- Line and column when available.

UX:
- Filter by level.
- Search logs.
- Collapse noisy entries.
- Copy entry.
- Expand object payloads.
- Map console events onto the video timeline and show error/warn indicators on the scrubber in the web app issue viewer.

## Network Capture
Capture:
- Request URL.
- Method.
- Status code.
- Request headers after redaction.
- Response headers after redaction.
- Request body when allowed and under size limit.
- Response body when allowed and under size limit.
- Start time.
- End time.
- Duration.
- Size.
- Failure reason.
- Resource type.
- Initiator when available.
- WebSocket events where feasible.

Privacy:
- Redact cookies, authorization headers, tokens, API keys, passwords, payment data, and configured patterns.
- Allow project-level denylist for domains, headers, and body fields.
- Respect max body capture size.

UX:
- Table view with method, URL, status, duration, size, type.
- Failed-only filter.
- Search by URL, status, method, body text.
- Detail drawer for request and response.
- Copy as cURL where safe.
- Map network events onto the video timeline and show failure/slow-request indicators on the scrubber in the web app issue viewer.

## JavaScript Error Capture
Capture:
- Error message.
- Stack trace.
- Source file.
- Line and column.
- Error type.
- Timestamp.
- Related console entry.
- Related network request when timing suggests correlation.

UX:
- Dedicated errors panel.
- Group repeated errors.
- Link stack frames to source URLs when possible.
- Map error events onto the video timeline and treat them as first-class scrubber markers in the web app issue viewer.

## User Action Timeline
Capture important actions without collecting sensitive input values.

Events:
- Clicks.
- Route changes.
- Page navigations.
- Reloads.
- Form submissions.
- Key interactions without raw text for sensitive fields.
- Scroll milestones.
- Focus changes for meaningful controls.
- Manual markers.

Fields:
- Timestamp.
- Action type.
- Element summary.
- URL.
- Coordinates if useful.
- Privacy classification.

UX:
- Show as readable reproduction trail.
- Convert to AI reproduction steps.
- Click action to seek video.
- Map user actions onto the video timeline as lightweight markers in the web app issue viewer.
- Allow user to delete noisy or sensitive actions before sharing.

## Video, console, and network timeline correlation
All evidence streams must share a single timebase: milliseconds from recording start (`t=0` at recording start, monotonic during pause/resume rules).

Mapping rules:
- Every console, network, error, performance, user action, and marker event stores `timestampMs` relative to recording start.
- Video playback time maps directly: `videoTimeSec * 1000` corresponds to the same `timestampMs` domain.
- For network requests with duration, store both `startTimestampMs` and `endTimestampMs` so the UI can render spans, not only points.
- If clock skew or missing timestamps occur, the UI must degrade gracefully and show an "unsynchronized" warning with a repair action where possible.

Web app issue viewer UX (post-save, `/issue/[id]`):
- Video scrubber shows layered markers:
  - Console errors and warnings.
  - Failed and slow network requests.
  - JavaScript error events.
  - Manual markers and navigation markers.
- Hovering a marker shows a compact tooltip: event type, time, one-line summary, severity.
- Clicking a marker:
  - Seeks the video to the marker time (or the start of a network span).
  - Opens the corresponding row in the active panel (console or network) and scrolls it into view.
  - Highlights the selected event until the user clears selection.
- Clicking a console or network row seeks the video to that event time (or span start) and moves the playhead.
- Keyboard navigation moves selection across events and updates the video time accordingly.
- Marker density controls: cluster nearby markers when zoomed out; expand clusters when zoomed in.
- Optional lanes: separate lanes for console vs network vs errors to reduce overlap.

Extension UX note:
- The extension may show marker ticks on the video scrubber during lightweight review, but it must not ship full console/network panels in the extension. Full correlation UI lives in `/issue/[id]`.

## Performance Markers
Capture:
- Long tasks.
- Layout shifts.
- Largest Contentful Paint.
- Navigation timing.
- Resource timing summaries.
- Memory pressure if available.
- Dropped frame or UI jank hints where measurable.

UX:
- Timeline markers.
- Performance panel.
- "This happened near the bug" summary.

## Manual And Automatic Markers
Markers help users and developers jump to important moments.

Manual marker:
- User clicks "Add marker" during recording.
- Optional quick label.
- Shows in review timeline.

Automatic markers:
- Console error.
- Failed request.
- Slow request.
- Unhandled exception.
- Page navigation.
- Route change.
- Long task.
- Layout shift.
- User stops recording.

## Post-Recording Review
After stopping, users should not face a blank form.

Extension review screen (lightweight, pre-save):
- Video player.
- Timeline scrubber with lightweight marker ticks for manual markers and high-signal previews. Full marker lanes and two-way console/network correlation live in `/issue/[id]`.
- AI suggested title.
- AI summary.
- AI reproduction steps.
- Severity and priority.
- Important moments list.
- Trim controls.
- Add annotation/pin.
- Delete sensitive event.
- Blur frame or screenshot if needed.
- Save draft.
- Save issue and open in web app.

Web app issue page (full fidelity, post-save):
- Route: `/issue/[id]` in the main Vue app.
- Console, network, errors, performance, and user action panels.
- Request detail view with headers, payload, response, timing, and status.
- Full synchronized timeline scrubbing against the video, including clickable markers on the video scrubber that jump to the matching console/network/error events.
- Publishing controls for the issue link (private vs public), comments, lifecycle, and integrations.

Important:
- The extension must **not** show DevTools-style console/network/error tabs during post-recording review. Full console/network inspection and two-way timeline correlation belong in `/issue/[id]`.

Smart defaults:
- Title from AI.
- Severity from evidence.
- Reproduction steps from user actions.
- Suggested destination from project settings.
- Suggested duplicate if similar issue exists.

## Upload Flow
Requirements:
- Upload metadata separately from binary files.
- Upload video to Cloudflare R2.
- Store issue/session metadata in Neon.
- Use resumable or chunked upload for larger recordings.
- Show progress.
- Retry failed chunks.
- Preserve local draft until server confirms success.
- Allow background upload where browser constraints permit.

Failure recovery:
- Retry upload.
- Save local draft.
- Export debug bundle.
- Copy text summary.
- Delete local draft.

## AI Processing
Triggered after the issue is created (server-side), with optional lightweight preview copy in the extension review UI.

Inputs:
- User description.
- Timeline events.
- Console errors.
- Failed network requests.
- User action trail.
- Browser/device metadata.
- Selected video frames or screenshots.

Outputs:
- Title.
- Summary.
- Reproduction steps.
- Severity.
- Priority.
- Duplicate candidates.
- Likely root cause.
- Suggested integration fields.
- Suggested fix verification checklist.

Requirements:
- User can edit all AI output.
- AI output should link back to evidence timestamps.
- AI should avoid claiming certainty without evidence.
- Workspace AI settings must be respected.

## Issue Output
A submitted recording issue should include:
- Title.
- Summary.
- Video.
- Timeline.
- Console logs.
- Network requests.
- Errors.
- User actions.
- Performance markers.
- Environment metadata.
- Reproduction steps.
- Severity and priority.
- Attachments.
- Share link visibility: private or public.
- Integration links.
- Activity history.

## Backend Requirements
- Hono routes for creating recording sessions, uploading metadata, uploading video, finalizing issue, retrieving issue, and generating signed asset URLs.
- Neon tables for issues, capture sessions, timeline events, network requests, console events, error events, user actions, attachments, AI outputs, and status history.
- R2 objects for video, thumbnails, screenshots, and exported bundles.
- Cloudflare Queues for AI processing, thumbnail generation, retryable integration sends, upload cleanup, and retention deletion.

## Data Model

### Recording Session
Fields:
- ID.
- Organization ID.
- Project ID.
- Created by.
- Source: extension or issue submission link.
- Page URL.
- Environment.
- Status: recording, processing, draft, uploading, submitted, failed.
- Started timestamp.
- Stopped timestamp.
- Duration.
- Capture settings.
- Privacy settings.
- Video attachment ID.

### Timeline Event
Fields:
- ID.
- Session ID.
- Kind: console, network, error, user_action, performance, marker, navigation.
- Timestamp.
- Severity.
- Summary.
- Data JSON.
- Redaction status.

### Attachment
Fields:
- ID.
- Session ID.
- Issue ID.
- Type: video, thumbnail, screenshot, clip, export.
- R2 key.
- Content type.
- Size.
- Duration when media.
- Width and height when visual.
- Created timestamp.

## Privacy And Security
Requirements:
- Clear capture consent.
- Redaction before upload where possible.
- Project-level network capture rules.
- Sensitive field masking.
- Manual pause.
- Manual blur.
- Local draft deletion.
- Private links by default for team workspaces.
- Audit events for view, share, export, delete, integration send.

## Acceptance Criteria
- User can start recording from extension in under 3 clicks.
- Recording state is always visible.
- User can add at least one marker during recording.
- Console, network, errors, and user actions align with video timestamps.
- User can trim and share a report after stopping.
- Upload failure does not destroy local recording.
- Developer can open issue viewer and jump bidirectionally between video time, scrubber markers, and console/network/error rows.
- Sensitive headers are redacted before display and upload.

## Future Enhancements
- Instant replay buffer.
- Browser extension capture for multiple tabs.
- Microphone narration.
- Automatic silence/dead-time trimming.
- Visual diff between bug capture and fixed version.
- Playwright test generation from action trail.
- Observability trace correlation.
- Offline capture with later sync.
