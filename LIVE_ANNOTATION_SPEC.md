# Live Annotation Spec

## Summary
Live annotation creates **annotation issues**. Each submitted pin becomes its own issue with its own issue link, which can be published publicly or kept private by policy.

Unlike screen recording, live annotation does not need to capture the full technical timeline by default. It should feel fast, visual, precise, and safe.

## Primary Goals
- Let a user point at a UI problem and create a clear issue quickly.
- Anchor each note to the right element or page region.
- Support multi-pin design and QA review sessions.
- Let developers view open issues overlaid on the real product page.
- Preserve context when the DOM changes or the page is scrolled.
- Keep the overlay non-invasive and privacy-safe.

## User Personas
- QA tester marking broken UI or behavior.
- Designer reviewing visual implementation.
- Product manager leaving copy or UX feedback.
- Developer reviewing open issues on the current page.
- Support teammate adding context to a customer-reported problem.

## Entry Points
- Extension popup: Start annotation.
- Extension floating launcher: Annotate this page.
- Keyboard shortcut: configurable.
- Dashboard issue detail: Open issue on page.
- Developer overlay: Show current page issues.
- Screen recording review: Add annotation at current moment.

## Annotation Modes

### Quick Pin
Fastest flow for one issue.

Flow:
1. User clicks "Annotate".
2. Page enters hover highlight mode.
3. User clicks target element or region.
4. Pin composer opens.
5. User writes comment and optionally adds screenshot.
6. User submits or saves draft.

### Multi-Pin Session
Used for design review or QA pass.

Flow:
1. User starts annotation session.
2. User creates multiple pins.
3. User can move between pins from page or pin list.
4. User submits each pin as its own annotation issue, each with its own issue link.
5. Optional: user can link related issues together using a shared review tag or duplicate group for easier navigation.

### Developer Overlay
Used by developers to inspect active issues on the current URL.

Flow:
1. Developer opens extension.
2. Extension shows issue count for current page.
3. Developer enables overlay.
4. Pins render on the live page.
5. Developer opens pins, comments, changes status, or opens full issue.

## Overlay UX
The overlay must be obvious but lightweight.

Required behavior:
- Highlight hovered element with visible outline.
- Show a small tooltip with element label when useful.
- Do not block page scroll unless actively placing or dragging a pin.
- Keep overlay controls above page content.
- Hide internal overlay elements from screenshots unless user chooses to include them.
- Support escape key to exit.
- Support undo for last pin action.
- Warn before leaving with unsaved pins.

Overlay states:
- Idle.
- Hovering.
- Pin composer open.
- Dragging pin.
- Screenshot markup open.
- Session review.
- Developer view.
- Uploading.
- Failed with retry.

## Pin Placement
Pins should land exactly where the user clicks.

Data to store:
- Element anchor.
- Click offset within element as percentages.
- Viewport bounding box at capture time.
- Page URL and route.
- Scroll position at capture.
- Device pixel ratio.
- Screenshot crop bounds when available.

Placement rules:
- Prefer element-relative placement.
- Fall back to route plus text fingerprint if selector breaks.
- Fall back to viewport-relative placement if element is gone.
- Mark stale or unresolvable pins clearly.
- Allow user to re-anchor stale pins.

## Element Anchoring
The anchor should survive common SPA and design-system changes.

Anchor fields:
- CSS selector.
- XPath fallback.
- Element tag name.
- Stable attributes: id, name, role, aria-label, data-testid, href, type.
- Text fingerprint.
- Ancestor fingerprint.
- Element bounding box.
- Click offset.
- URL path and query policy.
- Optional component hint if app SDK provides it.

Resolution order:
1. Stable test or semantic attributes.
2. ID selector.
3. Unique role/name combination.
4. Unique text fingerprint.
5. CSS selector.
6. XPath.
7. Bounding box fallback.

## Pin Composer
The composer should be compact but powerful.

Fields:
- Comment: required.
- Issue type: visual bug, layout issue, copy issue, broken behavior, missing element, accessibility, performance, other.
- Severity: low, medium, high, critical.
- Priority: optional, can be AI-suggested.
- Assignee: optional.
- Labels: optional.
- Screenshot: optional.
- Short clip: optional.
- Link to existing issue: optional.

Smart defaults:
- Severity defaults to medium.
- Issue type can be suggested from comment.
- Project is inferred from current URL.
- Assignee can be suggested from ownership rules.
- Duplicate warning appears before submission if similar issue exists.

## Screenshot Markup
Annotation should include a strong markup tool.

Tools:
- Crop.
- Rectangle.
- Arrow.
- Line.
- Freehand pen.
- Text.
- Highlight.
- Blur.
- Numbered callouts.
- Undo/redo.
- Reset.

Requirements:
- Markup should preserve original screenshot.
- Export should create a final PNG attachment.
- User can copy screenshot to clipboard.
- Blur and redaction should happen before upload.

## Short Clip Attachment
Pins can include a lightweight clip.

Requirements:
- Max default duration: 60 seconds.
- No console/network capture by default.
- Shows countdown and stop button.
- Clip attaches to the pin, not the whole session.
- User can delete or re-record before submitting.

## Pin List And Navigation
The page should have a compact pin list.

Features:
- Show all pins in current session.
- Show existing issues in developer overlay.
- Filter by status, severity, author, assignee, and issue type.
- Click list item to scroll to pin.
- Click pin to open composer or issue card.
- Show stale/unresolved anchor state.
- Show unsaved/draft state.

## Collaboration
Live annotation should support team workflows.

Features:
- Threaded comments per pin.
- Mentions.
- Reactions.
- Status updates.
- Assignment.
- Activity history.
- Resolve/reopen from overlay.
- Link to full issue page.
- Real-time updates later through Durable Objects or WebSockets.

## AI Enhancements
AI should reduce annotation friction.

Features:
- Suggest issue type from comment and screenshot.
- Suggest severity.
- Generate concise title.
- Detect duplicates by page URL, anchor, screenshot, and text.
- Suggest assignee/component from project rules.
- Summarize a multi-pin review into a short narrative for chat or Slack, without merging issues unless the user explicitly chooses to.
- Suggest linking related issues created in the same session for easier triage.

## Privacy And Safety
Requirements:
- Manual blur before upload.
- Auto-detect sensitive fields and offer blur.
- Never capture typed password values.
- Avoid collecting console/network data in annotation-only mode unless user explicitly upgrades to recording.
- Warn before publishing a public issue link.
- Allow draft deletion.
- Exclude overlay UI from captures by default.

## Data Model

### Annotation Session
Fields:
- ID.
- Organization ID.
- Project ID.
- Created by.
- Page URL.
- URL path.
- Environment.
- Status: draft, submitted, archived.
- Created timestamp.
- Updated timestamp.
- Pin count.
- Related issue tag: optional shared tag for issues created in the same session.

### Pin
Fields:
- ID.
- Session ID.
- Issue ID when submitted.
- Index.
- Anchor.
- Offset X.
- Offset Y.
- Comment.
- Issue type.
- Severity.
- Priority.
- Assignee.
- Labels.
- Screenshot attachment ID.
- Clip attachment ID.
- Status.
- Created by.
- Created timestamp.
- Updated timestamp.

### Anchor
Fields:
- Selector.
- XPath.
- Tag name.
- Role.
- Accessible name.
- Text fingerprint.
- Attribute fingerprint.
- Ancestor fingerprint.
- Bounding box.
- Viewport size.
- Device pixel ratio.
- Scroll position.
- URL path.

## Backend Requirements
- Hono routes for creating sessions, creating pins, updating pins, uploading attachments, submitting pins as issues, publishing issue links, and resolving anchors.
- Neon tables for annotation sessions, pins, anchors, comments, attachments, and activity events.
- R2 storage for screenshots and clips.
- Cloudflare Queues for AI summaries, duplicate detection, and notification jobs.

## Acceptance Criteria
- User can create a pin with comment in under 15 seconds.
- Pin appears at the clicked point after scroll and reload when the element still exists.
- User can create at least 20 pins in a session without visible page jank.
- Overlay can be exited cleanly with unsaved work preserved.
- Screenshot markup can blur sensitive areas before upload.
- Developer can open current page issues from extension and update status.
- Stale anchors are visible and can be re-anchored.

## Future Enhancements
- Figma-style design review mode.
- Accessibility audit pins.
- Component ownership from source maps or app SDK.
- Realtime collaborative annotation.
- Visual regression comparison.
- Heatmap of bug-prone UI areas.
