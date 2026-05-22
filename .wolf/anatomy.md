# anatomy.md

> Auto-maintained by OpenWolf. Last scanned: 2026-05-22T18:34:13.829Z
> Files: 301 tracked | Anatomy hits: 0 | Misses: 0

## ./

- `.gitignore` — Git ignore rules (~33 tok)
- `BUILDPLAN.md` — DevProbe — Build Plan (~2708 tok)
- `CLAUDE.md` — OpenWolf (~231 tok)
- `GENERAL_SPEC.md` — General Product Spec (~2598 tok)
- `HANDOFF.md` — DevProbe — Session Handoff (~5354 tok)
- `LIVE_ANNOTATION_SPEC.md` — Live Annotation Spec (~2250 tok)
- `package.json` — Node.js package manifest (~167 tok)
- `pnpm-lock.yaml` — pnpm lock file (~63618 tok)
- `pnpm-workspace.yaml` (~12 tok)
- `SCREEN_RECORDING_SPEC.md` — Screen Recording Spec (~3784 tok)
- `tsconfig.base.json` (~133 tok)

## .claude/

- `launch.json` (~100 tok)
- `settings.json` (~441 tok)
- `settings.local.json` — Declares icons (~593 tok)

## .claude/rules/

- `openwolf.md` (~313 tok)

## apps/extension/

- `package.json` — Node.js package manifest (~254 tok)
- `postcss.config.js` — PostCSS configuration (~24 tok)
- `tailwind.config.ts` — Tailwind CSS configuration (~606 tok)
- `wxt.config.ts` (~384 tok)

## apps/extension/.wxt/

- `tsconfig.json` — TypeScript configuration (~164 tok)
- `wxt.d.ts` — / <reference types="wxt/vite-builder-env" /> (~95 tok)

## apps/extension/.wxt/types/

- `globals.d.ts` — Declares ImportMetaEnv (~108 tok)
- `i18n.d.ts` — See https://developer.chrome.com/docs/extensions/reference/i18n/#method-getMessage (~688 tok)
- `imports.d.ts` — Declares ContentScriptContext (~3012 tok)
- `paths.d.ts` — Exports PublicPath, WxtRuntime (~110 tok)

## apps/extension/src/assets/

- `content.css` — Styles: 5 rules, 1 layers (~159 tok)
- `main.css` — Styles: 8 rules, 2 layers (~485 tok)

## apps/extension/src/components/base/

- `Icon.vue` — Vue: setup, TS, 4 props (~230 tok)

## apps/extension/src/components/capture/

- `ComposeHeading.vue` — e.g. "Recording", "Screenshot". Rendered as `New {mode}`. (~1020 tok)
- `IssueComposePanel.vue` — Vue: setup (~2498 tok)
- `PostComposeModal.vue` — "Recording" | "Screenshot" — heading title (~1103 tok)
- `RegionSelector.vue` — Vue: setup, TS, emits (~1211 tok)

## apps/extension/src/components/capture/annotation/

- `AnnotationOverlay.vue` — Build a renderable ExistingPin from a server row. Returns null if anchor missing. (~4202 tok)
- `AnnotationPin.vue` — "draft" = composer still open; "submitted" = issue persisted. (~507 tok)
- `AnnotationPinComposer.vue` — Issue type values mirror the `annotation_issue_type` DB enum exactly. (~2290 tok)
- `AnnotationPinDetail.vue` — Vue: setup (~1181 tok)
- `AnnotationToolbar.vue` — Vue: setup (~832 tok)

## apps/extension/src/components/capture/recording/

- `RecordingCapture.vue` — Trimmer-visible markers (warnings + errors). (~2056 tok)
- `RecordingControlBar.vue` — Vue: setup (~634 tok)
- `RecordingControls.vue` — Vue: fully controlled playback controls row; emits all actions (~280 tok)
- `RecordingHeader.vue` — Vue: setup (~549 tok)
- `RecordingMarkerTooltip.vue` — Vue: setup (~626 tok)
- `RecordingPanel.vue` — Vue: setup (~1090 tok)
- `RecordingTimeline.vue` — Vue: waveform scrubber, event markers, draggable playhead; emits seek/seek-to-ms (~350 tok)
- `RecordingVideo.vue` — Vue: setup (~776 tok)
- `types.ts` — MarkerType union + RecordingMarker interface (~90 tok)
- `useRecordingPlayback.ts` — All video playback state and imperative controls in one place. (~953 tok)
- `useRecordingPlayback.ts` — All video playback state and imperative controls in one place. (~805 tok)
- `utils.ts` — Coerce non-finite (NaN, Infinity) or negative values to 0. (~263 tok)
- `utils.ts` — Format milliseconds as m:ss.d (e.g. 0:12.0, 1:04.5) (~191 tok)

## apps/extension/src/components/capture/recording/timeline/

- `RecordingMarkerTooltip.vue` — Vue: setup (~626 tok)
- `RecordingTimeline.vue` — Vue: setup (~2356 tok)

## apps/extension/src/components/capture/recording/toolbar/

- `RecordingControlBar.vue` — Vue: setup (~663 tok)
- `RecordingControls.vue` — Vue: setup (~1154 tok)

## apps/extension/src/components/capture/screenshot/

- `ScreenshotCapture.vue` — Vue: setup (~935 tok)
- `ScreenshotPanel.vue` — Vue: setup, TS, 1 props (~642 tok)

## apps/extension/src/components/capture/screenshot/annotation/

- `AnnotationCanvas.vue` — Vue: setup, TS, 3 props, emits (~1627 tok)
- `AnnotationToolbar.vue` — Vue: setup, TS, 5 props, emits (~2056 tok)
- `ToolbarTip.vue` — Vue: setup, TS, 2 props (~413 tok)
- `types.ts` — Annotation tool & shape types. (~326 tok)
- `useAnnotationCanvas.ts` — useAnnotationCanvas (~6240 tok)

## apps/extension/src/components/launcher/

- `ConnectPrompt.vue` — Vue: setup (~448 tok)
- `FloatingLauncher.vue` — Vue: setup (~1352 tok)
- `LauncherItem.vue` — Vue: setup, TS, 5 props, emits (~641 tok)

## apps/extension/src/entrypoints/

- `background.ts` — API proxy (~5586 tok)
- `content.ts` — Content script — mounts UIs into the page via shadow DOM: (~7053 tok)
- `page-probe.content.ts` — Page probe — MAIN-world content script. (~2634 tok)

## apps/extension/src/entrypoints/offscreen/

- `index.html` — DevProbe Offscreen (~115 tok)
- `main.ts` — Offscreen recording host. (~1620 tok)

## apps/extension/src/entrypoints/popup/

- `App.vue` — Vue: setup (~1417 tok)
- `index.html` — DevProbe (~137 tok)
- `main.ts` — Initialise theme then mount — wrapped in IIFE because top-level await is (~185 tok)

## apps/extension/src/entrypoints/popup/components/

- `AccountMenu.vue` — Vue: setup (~968 tok)
- `ActionItem.vue` — Vue: setup, TS, 4 props, emits (~454 tok)
- `ActionList.vue` — Vue: setup (~505 tok)
- `ActiveFolderChip.vue` — Vue: setup (~393 tok)
- `PopupHeader.vue` — Vue: setup, TS, 2 props (~525 tok)
- `RecordingActiveView.vue` — Vue: setup (~464 tok)

## apps/extension/src/entrypoints/popup/composables/

- `usePopupAccount.ts` — Popup account state. (~879 tok)
- `useRecordingStatus.ts` — Tracks the global active-recording state surfaced by the content script. (~467 tok)

## apps/extension/src/lib/

- `anchor.ts` — Element anchoring for live annotation. (~1875 tok)
- `annotation-state.ts` — annotation-state (~716 tok)
- `api.ts` — API client (~2900 tok)
- `auth.ts` — Exports StoredAuth, getAuth, setAuth, clearAuth, onAuthChange (~593 tok)
- `capture-streams.ts` — Capture streams during a screen recording. (~1941 tok)
- `element-blur.ts` — Element-targeted blur for screen recording. (~1419 tok)
- `env.ts` — Exports WEB_APP_URL, API_URL (~48 tok)
- `extension.ts` — Extension runtime helpers. (~253 tok)
- `metadata.ts` — Exports collectBrowserMeta, dataUrlToBlob (~1394 tok)
- `page-probe-payload.ts` — Shared message contract between the MAIN-world page probe and the isolated (~390 tok)
- `recording-drafts.ts` — Recording drafts — local persistence for in-flight recording uploads. (~943 tok)
- `redact.ts` — Redaction helpers — privacy-first per SCREEN_RECORDING_SPEC.md. (~1266 tok)
- `theme.ts` — Theme helpers — shared by popup and content scripts. (~781 tok)

## apps/web/

- `env.d.ts` — / <reference types="vite/client" /> (~51 tok)
- `index.html` — DevProbe (~82 tok)
- `package.json` — Node.js package manifest (~285 tok)
- `postcss.config.js` — PostCSS configuration (~24 tok)
- `tailwind.config.ts` — Tailwind CSS configuration (~728 tok)
- `tsconfig.json` — TypeScript configuration (~99 tok)
- `tsconfig.node.json` (~66 tok)
- `vite.config.ts` — Vite build configuration (~155 tok)

## apps/web/src/

- `App.vue` — Vue: setup, TS (~32 tok)
- `main.ts` — Apply saved/system theme before first render to avoid flash (~479 tok)

## apps/web/src/app/

- `router.ts` — Declares router (~649 tok)

## apps/web/src/assets/

- `main.css` — Styles: 9 rules, 2 layers (~532 tok)

## apps/web/src/components/

- `ModeIcon.vue` — Vue: setup, TS, 1 props (~217 tok)
- `SeverityChip.vue` — Vue: setup, TS, 1 props (~229 tok)
- `StatusChip.vue` — Vue: setup, TS, 1 props (~385 tok)

## apps/web/src/components/base/

- `Icon.vue` — Vue: setup, TS, 5 props (~199 tok)

## apps/web/src/composables/

- `useTheme.ts` — Exports useTheme (~212 tok)

## apps/web/src/features/auth/

- `auth.store.ts` — Auth store (~1207 tok)

## apps/web/src/features/dashboard/components/

- `IssueCard.vue` — Vue: setup (~2152 tok)
- `IssueCardSkeleton.vue` — Vue component (~401 tok)
- `IssueFilters.vue` — Vue: setup (~944 tok)
- `IssuesBulkBar.vue` — Vue: setup (~1481 tok)

## apps/web/src/features/dashboard/composables/

- `useIssues.ts` — "all" is a sentinel value used by the filter UI (shadcn Select can't have (~617 tok)
- `useIssueSelection.ts` — useIssueSelection (~452 tok)

## apps/web/src/features/folders/

- `FoldersPage.vue` — Vue: setup (~554 tok)

## apps/web/src/features/folders/components/

- `CreateFolderDialog.vue` — Vue: setup (~1434 tok)
- `FolderCard.vue` — Vue: setup (~197 tok)

## apps/web/src/features/folders/composables/

- `useFolders.ts` — Owns the folders list — fetch, create, in-place prepend on success. (~288 tok)

## apps/web/src/features/folders/utils/

- `color.ts` — Deterministic color assignment for folders + workspaces, so the same id (~267 tok)

## apps/web/src/features/issues/

- `IssuePage.vue` — Vue: setup (~2063 tok)

## apps/web/src/features/issues/components/

- `ConsoleBadge.vue` — Level badge for console events (error/warn/info/debug/log) (~150 tok)
- `IssueDetailHeader.vue` — Full issue id — used to derive the visible short id (DP-XXX style). (~2197 tok)
- `IssueDetailsCard.vue` — Vue: setup (~2819 tok)
- `IssueHeader.vue` — Vue: setup (~261 tok)
- `IssueMedia.vue` — Vue: setup, exposes seekTo(ms) via videoPlayerRef chain (~650 tok)
- `IssueMediaImage.vue` — Vue: setup (~428 tok)
- `IssueMediaVideo.vue` — Vue: setup, exposes seekTo(ms) via videoEl ref (~350 tok)
- `IssuePageSkeleton.vue` — Vue component (~765 tok)
- `IssueTimeline.vue` — Tabbed timeline panel (Console/Network/Errors/User Actions/Navigation) with click-to-seek (~900 tok)
- `IssueTitleBlock.vue` — Vue: setup (~792 tok)
- `NetworkBadge.vue` — Method + HTTP status badge for network events (~200 tok)
- `RecordingView.vue` — Vue: setup (~524 tok)
- `SeverityPill.vue` — Severity pill for error events (critical/high/medium/low) (~150 tok)
- `TimelineRow.vue` — Single timeline event row with timestamp seek chip (~300 tok)
- `UserAvatar.vue` — Vue: setup (~556 tok)

## apps/web/src/features/issues/components/recording/

- `RecordingVideoControls.vue` — `mm:ss` / `h:mm:ss` for long recordings. (~739 tok)
- `RecordingVideoPlayer.vue` — Attachment id for the hero video — fetched via the authed blob endpoint. (~1416 tok)
- `RecordingVideoTimeline.vue` — 0..1 — playback progress. (~1043 tok)
- `usePlayback.ts` — usePlayback (~1442 tok)

## apps/web/src/features/issues/composables/

- `useAttachmentUrl.ts` — Fetches a signed attachment URL (~100 tok)
- `useIssue.ts` — useIssue (~921 tok)
- `useIssueEvents.ts` — useIssueEvents (~646 tok)
- `useIssueMutations.ts` — useIssueMutations (~917 tok)
- `useWorkspaceMembers.ts` — useWorkspaceMembers (~304 tok)

## apps/web/src/features/settings/

- `SettingsPage.vue` — Vue: setup (~695 tok)

## apps/web/src/features/workspace-shell/

- `DashboardLayout.vue` — Vue: setup (~1882 tok)

## apps/web/src/features/workspace-shell/components/

- `CreateWorkspaceDialog.vue` — Vue: setup (~662 tok)
- `WorkspaceSwitcher.vue` — Vue: setup (~1044 tok)

## apps/web/src/layouts/

- `DashboardLayout.vue` — Vue: setup (~1445 tok)

## apps/web/src/lib/

- `api.ts` — Exports api (~182 tok)
- `format.ts` — Exports timeAgo, truncate (~169 tok)
- `mock.ts` — Exports MockFolder, MOCK_FOLDERS, MOCK_ISSUES (~2298 tok)
- `utils.ts` — Exports cn (~49 tok)

## apps/web/src/pages/

- `DashboardPage.vue` — Vue: setup (~3255 tok)
- `ExtensionConnectPage.vue` — Vue: setup (~1353 tok)
- `FoldersPage.vue` — Vue: setup (~1567 tok)
- `IssuePage.vue` — Vue: setup (~1498 tok)
- `LoginPage.vue` — Vue: setup, TS (~595 tok)
- `NotFoundPage.vue` — Vue: setup, TS (~127 tok)
- `ProjectsPage.vue` — Vue: setup, TS (~255 tok)
- `SettingsPage.vue` — Vue: setup, TS (~209 tok)
- `SignupPage.vue` — Vue: setup, TS (~716 tok)

## apps/web/src/pages/auth/

- `Login.vue` — Vue: setup (~268 tok)
- `Signup.vue` — Vue: setup (~252 tok)

## apps/web/src/pages/folders/

- `Folder.vue` — Vue: setup (~944 tok)

## apps/web/src/pages/integrations/

- `Integrations.vue` — Vue: setup (~174 tok)

## apps/web/src/pages/issues/

- `Issue.vue` — Vue: setup (~1122 tok)
- `Issues.vue` — Vue: setup (~778 tok)

## apps/web/src/router/

- `index.ts` — Declares router (~602 tok)

## apps/web/src/shared/lib/

- `mock.ts` — Exports MOCK_ISSUES, MOCK_FOLDERS (~1716 tok)

## apps/web/src/stores/

- `auth.ts` — API routes: GET, POST (3 endpoints) (~629 tok)

## packages/api/

- `.dev.vars.example` — Cloudflare Worker secrets for `wrangler dev` (--env development). (~131 tok)
- `drizzle.config.ts` — Drizzle ORM configuration (~63 tok)
- `package.json` — Node.js package manifest (~233 tok)
- `tsconfig.json` — TypeScript configuration (~52 tok)
- `wrangler.toml` (~310 tok)

## packages/api/drizzle/meta/

- `_journal.json` (~19 tok)

## packages/api/src/

- `index.ts` — API routes: GET (1 endpoints) (~596 tok)

## packages/api/src/db/

- `client.ts` — Exports Db, createDb (~87 tok)
- `schema.ts` — Exports issueModeEnum, issueSourceEnum, issueStatusEnum, severityEnum + 19 more (~6222 tok)

## packages/api/src/lib/

- `env.ts` — Exports Env (~67 tok)
- `jwt.ts` — Exports JwtPayload, signJwt, verifyJwt (~258 tok)
- `response.ts` — Exports ok, err, Errors (~262 tok)
- `routing.ts` — Resolve the folder a captured issue belongs to by matching its page URL (~436 tok)

## packages/api/src/middleware/

- `auth.ts` — Exports AuthContext, requireAuth (~270 tok)

## packages/api/src/queues/

- `handlers.ts` — Exports QueueMessage, handleAiQueue, handleIntegrationQueue, handleNotificationQueue (~386 tok)

## packages/api/src/routes/

- `attachments.ts` — API routes: POST, GET (8 endpoints) (~872 tok)
- `auth.ts` — API routes: POST, GET (11 endpoints) (~1844 tok)
- `folders.ts` — API routes: GET, POST (4 endpoints) (~442 tok)
- `issues.ts` — API-internal: shape of POST /issues/bulk. Not exported via @deveprobe/shared (~4047 tok)
- `projects.ts` — API routes: GET, POST (4 endpoints) (~446 tok)

## packages/shared/

- `package.json` — Node.js package manifest (~84 tok)
- `tsconfig.json` — TypeScript configuration (~34 tok)

## packages/shared/src/

- `enums.ts` — Exports IssueSource, IssueSource, IssueMode, IssueMode + 22 more (~973 tok)
- `index.ts` (~25 tok)
- `schemas.ts` — `null` clears the folder (issue lives at workspace root). (~2706 tok)
- `types.ts` — Exports Org, User, Membership, Folder + 17 more (~1694 tok)

## packages/ui/

- `components.json` (~91 tok)
- `package.json` — Node.js package manifest (~162 tok)
- `tailwind.config.ts` — Tailwind CSS configuration (~506 tok)
- `tsconfig.json` — TypeScript configuration (~48 tok)

## packages/ui/src/

- `globals.css` — Styles: 1 rules, 111 vars, 1 layers (~1615 tok)
- `index.ts` — ── Form & interactive ──────────────────────────────────────────────────────── (~921 tok)

## packages/ui/src/components/ui/avatar/

- `Avatar.vue` — Vue: setup, TS, 3 props (~143 tok)
- `AvatarFallback.vue` — Vue: setup, TS (~72 tok)
- `AvatarImage.vue` — Vue: setup, TS (~77 tok)
- `index.ts` — Exports avatarVariant, AvatarVariants (~215 tok)

## packages/ui/src/components/ui/badge/

- `Badge.vue` — Vue: setup, TS, 2 props (~106 tok)
- `index.ts` — Exports badgeVariants, BadgeVariants (~264 tok)

## packages/ui/src/components/ui/button/

- `Button.vue` — Vue: setup, TS (~176 tok)
- `index.ts` — Exports buttonVariants, ButtonVariants (~477 tok)

## packages/ui/src/components/ui/card/

- `Card.vue` — Vue: setup, TS, 1 props (~97 tok)
- `CardContent.vue` — Vue: setup, TS, 1 props (~73 tok)
- `CardDescription.vue` — Vue: setup, TS, 1 props (~77 tok)
- `CardFooter.vue` — Vue: setup, TS, 1 props (~78 tok)
- `CardHeader.vue` — Vue: setup, TS, 1 props (~78 tok)
- `CardTitle.vue` — Vue: setup, TS, 1 props (~88 tok)
- `index.ts` (~98 tok)

## packages/ui/src/components/ui/command/

- `Command.vue` — The count of all visible items. (~624 tok)
- `CommandDialog.vue` — Vue: setup, TS, emits (~256 tok)
- `CommandEmpty.vue` — Vue: setup, TS (~194 tok)
- `CommandGroup.vue` — Vue: setup, TS (~385 tok)
- `CommandInput.vue` — Vue: setup, TS (~289 tok)
- `CommandItem.vue` — Vue: setup, TS, emits (~602 tok)
- `CommandList.vue` — Vue: setup, TS (~179 tok)
- `CommandSeparator.vue` — Vue: setup, TS (~140 tok)
- `CommandShortcut.vue` — Vue: setup, TS, 1 props (~85 tok)
- `index.ts` (~291 tok)

## packages/ui/src/components/ui/dialog/

- `Dialog.vue` — Vue: setup, TS, emits (~104 tok)
- `DialogClose.vue` — Vue: setup, TS (~68 tok)
- `DialogContent.vue` — Vue: setup, TS, emits (~519 tok)
- `DialogDescription.vue` — Vue: setup, TS (~173 tok)
- `DialogFooter.vue` — Vue: setup, TS, 1 props (~98 tok)
- `DialogHeader.vue` — Vue: setup, TS, 1 props (~85 tok)
- `DialogScrollContent.vue` — Vue: setup, TS, emits (~485 tok)
- `DialogTitle.vue` — Vue: setup, TS (~180 tok)
- `DialogTrigger.vue` — Vue: setup, TS (~71 tok)
- `index.ts` (~161 tok)

## packages/ui/src/components/ui/dropdown-menu/

- `DropdownMenu.vue` — Vue: setup, TS, emits (~116 tok)
- `DropdownMenuCheckboxItem.vue` — Vue: setup, TS, emits (~338 tok)
- `DropdownMenuContent.vue` — Vue: setup, TS, emits (~342 tok)
- `DropdownMenuGroup.vue` — Vue: setup, TS (~76 tok)
- `DropdownMenuItem.vue` — Vue: setup, TS (~249 tok)
- `DropdownMenuLabel.vue` — Vue: setup, TS (~183 tok)
- `DropdownMenuRadioGroup.vue` — Vue: setup, TS, emits (~128 tok)
- `DropdownMenuRadioItem.vue` — Vue: setup, TS, emits (~336 tok)
- `DropdownMenuSeparator.vue` — Vue: setup, TS (~146 tok)
- `DropdownMenuShortcut.vue` — Vue: setup, TS, 1 props (~82 tok)
- `DropdownMenuSub.vue` — Vue: setup, TS, emits (~115 tok)
- `DropdownMenuSubContent.vue` — Vue: setup, TS, emits (~313 tok)
- `DropdownMenuSubTrigger.vue` — Vue: setup, TS (~238 tok)
- `DropdownMenuTrigger.vue` — Vue: setup, TS (~104 tok)
- `index.ts` (~314 tok)

## packages/ui/src/components/ui/input/

- `index.ts` (~14 tok)
- `Input.vue` — Vue: setup, TS, 3 props, emits (~277 tok)

## packages/ui/src/components/ui/label/

- `index.ts` (~14 tok)
- `Label.vue` — Vue: setup, TS (~163 tok)

## packages/ui/src/components/ui/popover/

- `index.ts` (~52 tok)
- `Popover.vue` — Vue: setup, TS, emits (~106 tok)
- `PopoverContent.vue` — Vue: setup, TS, emits (~361 tok)
- `PopoverTrigger.vue` — Vue: setup, TS (~72 tok)

## packages/ui/src/components/ui/select/

- `index.ts` (~200 tok)
- `Select.vue` — Vue: setup, TS, emits (~104 tok)
- `SelectContent.vue` — Vue: setup, TS, emits (~497 tok)
- `SelectGroup.vue` — Vue: setup, TS (~137 tok)
- `SelectItem.vue` — Vue: setup, TS (~306 tok)
- `SelectItemText.vue` — Vue: setup, TS (~72 tok)
- `SelectLabel.vue` — Vue: setup, TS (~112 tok)
- `SelectScrollDownButton.vue` — Vue: setup, TS (~208 tok)
- `SelectScrollUpButton.vue` — Vue: setup, TS (~204 tok)
- `SelectSeparator.vue` — Vue: setup, TS (~138 tok)
- `SelectTrigger.vue` — Vue: setup, TS (~292 tok)
- `SelectValue.vue` — Vue: setup, TS (~68 tok)

## packages/ui/src/components/ui/separator/

- `index.ts` (~16 tok)
- `Separator.vue` — Vue: setup, TS (~182 tok)

## packages/ui/src/components/ui/tabs/

- `index.ts` (~62 tok)
- `Tabs.vue` — Vue: setup, TS, emits (~101 tok)
- `TabsContent.vue` — Vue: setup, TS (~171 tok)
- `TabsList.vue` — Vue: setup, TS (~161 tok)
- `TabsTrigger.vue` — Vue: setup, TS (~276 tok)

## packages/ui/src/components/ui/textarea/

- `index.ts` (~16 tok)
- `Textarea.vue` — Vue: setup, TS, 3 props, emits (~264 tok)

## packages/ui/src/components/ui/toast/

- `index.ts` — Exports toastVariants, ToastProps (~537 tok)
- `Toast.vue` — Vue: setup, TS, emits (~179 tok)
- `ToastAction.vue` — Vue: setup, TS (~272 tok)
- `ToastClose.vue` — Vue: setup, TS (~238 tok)
- `ToastDescription.vue` — Vue: setup, TS (~146 tok)
- `Toaster.vue` — Vue: setup, TS (~241 tok)
- `ToastProvider.vue` — Vue: setup, TS (~71 tok)
- `ToastTitle.vue` — Vue: setup, TS (~139 tok)
- `ToastViewport.vue` — Vue: setup, TS (~164 tok)
- `use-toast.ts` — Exports StringOrVNode (~946 tok)

## packages/ui/src/components/ui/tooltip/

- `index.ts` (~71 tok)
- `Tooltip.vue` — Vue: setup, TS, emits (~106 tok)
- `TooltipContent.vue` — Vue: setup, TS, emits (~323 tok)
- `TooltipProvider.vue` — Vue: setup, TS (~73 tok)
- `TooltipTrigger.vue` — Vue: setup, TS (~72 tok)

## packages/ui/src/lib/

- `utils.ts` — Exports cn (~49 tok)
