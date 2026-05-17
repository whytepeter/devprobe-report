# anatomy.md

> Auto-maintained by OpenWolf. Last scanned: 2026-05-17T14:34:41.314Z
> Files: 268 tracked | Anatomy hits: 0 | Misses: 0

## ./

- `.gitignore` — Git ignore rules (~33 tok)
- `BUILDPLAN.md` — DevProbe — Build Plan (~2708 tok)
- `CLAUDE.md` — OpenWolf (~231 tok)
- `GENERAL_SPEC.md` — General Product Spec (~2598 tok)
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
- `wxt.config.ts` (~277 tok)

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

- `IssueComposePanel.vue` — Vue: setup (~2850 tok)
- `PostComposeModal.vue` — Vue: setup (~727 tok)
- `RegionSelector.vue` — Vue: setup, TS, emits (~1211 tok)

## apps/extension/src/components/capture/screenshot/

- `ScreenshotCapture.vue` — Vue: setup (~919 tok)
- `ScreenshotPanel.vue` — Vue: setup, TS, 1 props (~642 tok)

## apps/extension/src/components/capture/screenshot/annotation/

- `AnnotationCanvas.vue` — Vue: setup, TS, 3 props, emits (~1627 tok)
- `AnnotationToolbar.vue` — Vue: setup, TS, 5 props, emits (~2056 tok)
- `ToolbarTip.vue` — Vue: setup, TS, 2 props (~413 tok)
- `types.ts` — Annotation tool & shape types. (~326 tok)
- `useAnnotationCanvas.ts` — useAnnotationCanvas (~6240 tok)

## apps/extension/src/components/launcher/

- `ConnectPrompt.vue` — Vue: setup (~448 tok)
- `FloatingLauncher.vue` — Vue: setup (~1163 tok)
- `LauncherItem.vue` — Vue: setup, TS, 5 props, emits (~641 tok)

## apps/extension/src/entrypoints/

- `background.ts` — API proxy (~1806 tok)
- `content.ts` — Content script — mounts three possible UIs into the page via shadow DOM: (~2389 tok)

## apps/extension/src/entrypoints/popup/

- `App.vue` — Vue: setup (~905 tok)
- `index.html` — DevProbe (~137 tok)
- `main.ts` — Initialise theme then mount — wrapped in IIFE because top-level await is (~185 tok)

## apps/extension/src/entrypoints/popup/components/

- `AccountMenu.vue` — Vue: setup (~1451 tok)
- `ActionItem.vue` — Vue: setup, TS, 4 props, emits (~454 tok)
- `ActionList.vue` — Vue: setup, TS, emits (~503 tok)
- `ActiveProjectChip.vue` — Vue: setup (~396 tok)
- `PopupHeader.vue` — Vue: setup (~380 tok)

## apps/extension/src/entrypoints/popup/composables/

- `usePopupAccount.ts` — Popup account state — keeps the workspace identity, project list, and (~699 tok)

## apps/extension/src/lib/

- `api.ts` — API client (~808 tok)
- `auth.ts` — Exports StoredAuth, getAuth, setAuth, setDefaultProject + 2 more (~717 tok)
- `env.ts` — Exports WEB_APP_URL, API_URL (~48 tok)
- `extension.ts` — Extension runtime helpers. (~253 tok)
- `metadata.ts` — Exports collectBrowserMeta, dataUrlToBlob (~1394 tok)
- `theme.ts` — Theme helpers — shared by popup and content scripts. (~781 tok)

## apps/web/

- `env.d.ts` — / <reference types="vite/client" /> (~51 tok)
- `index.html` — DevProbe (~82 tok)
- `package.json` — Node.js package manifest (~324 tok)
- `postcss.config.js` — PostCSS configuration (~24 tok)
- `tailwind.config.ts` — Tailwind CSS configuration (~728 tok)
- `tsconfig.json` — TypeScript configuration (~189 tok)
- `tsconfig.node.json` (~66 tok)
- `vite.config.ts` — Vite build configuration (~155 tok)

## apps/web/src/

- `App.vue` — Vue: setup, TS (~32 tok)
- `main.ts` — Apply saved/system theme before first render to avoid flash (~206 tok)

## apps/web/src/assets/

- `main.css` — Styles: 9 rules, 2 layers (~532 tok)

## apps/web/src/components/

- `ModeIcon.vue` — Vue: setup, TS, 1 props (~217 tok)
- `SeverityChip.vue` — Vue: setup, TS, 1 props (~229 tok)
- `StatusChip.vue` — Vue: setup, TS, 1 props (~385 tok)

## apps/web/src/components/base/

- `Icon.vue` — Vue: setup, TS, 5 props (~199 tok)

## apps/web/src/components/layout/

- `AuthLayout.vue` — Vue: setup (~274 tok)
- `PageEmpty.vue` — Vue: setup (~219 tok)
- `PageHeader.vue` — Vue: setup (~184 tok)
- `UserMenu.vue` — Vue: setup (~781 tok)

## apps/web/src/composables/

- `useTheme.ts` — Exports useTheme (~212 tok)

## apps/web/src/features/auth/

- `LoginPage.vue` — Vue: setup (~269 tok)
- `SignupPage.vue` — Vue: setup (~253 tok)

## apps/web/src/features/auth/components/

- `LoginForm.vue` — Vue: setup (~625 tok)
- `SignupForm.vue` — Vue: setup (~829 tok)

## apps/web/src/features/dashboard/

- `DashboardPage.vue` — Vue: setup (~558 tok)

## apps/web/src/features/dashboard/components/

- `IssueCard.vue` — Vue: setup (~1066 tok)
- `IssueFilters.vue` — Vue: setup (~942 tok)
- `IssueGrid.vue` — Vue: setup (~158 tok)
- `IssueList.vue` — Vue: setup (~104 tok)
- `IssueRow.vue` — Vue: setup (~424 tok)
- `ViewToggle.vue` — Vue: setup (~354 tok)

## apps/web/src/features/dashboard/composables/

- `useIssues.ts` — API routes: GET (1 endpoints) (~548 tok)

## apps/web/src/features/dashboard/utils/

- `host.ts` — Exports hostOf (~35 tok)

## apps/web/src/features/extension-connect/

- `ExtensionConnectPage.vue` — Vue: setup (~701 tok)

## apps/web/src/features/extension-connect/components/

- `ConnectStateConnected.vue` — Vue: setup (~139 tok)
- `ConnectStateForm.vue` — Vue: setup (~568 tok)
- `ConnectStateUnauthed.vue` — Vue: setup (~121 tok)

## apps/web/src/features/extension-connect/composables/

- `useExtensionHandoff.ts` — Wraps chrome.runtime.sendMessage to perform the DEVPROBE_AUTH_HANDOFF. (~588 tok)

## apps/web/src/features/extension-connect/utils/

- `extension-id.ts` — Chrome extension ids are 32 lowercase letters [a-p], but we accept any (~166 tok)

## apps/web/src/features/issues/

- `IssuePage.vue` — Vue: setup (~1083 tok)

## apps/web/src/features/issues/components/

- `AttachmentImage.vue` — Vue: setup (~625 tok)
- `IssueActivity.vue` — Vue: setup (~765 tok)
- `IssueAttachments.vue` — Vue: setup (~399 tok)
- `IssueDescription.vue` — Vue: setup (~192 tok)
- `IssueHeader.vue` — Vue: setup (~262 tok)
- `IssueHero.vue` — Vue: setup (~541 tok)
- `IssueMedia.vue` — Vue: setup (~622 tok)
- `IssueMeta.vue` — Vue: setup (~300 tok)
- `TypeChip.vue` — Vue: setup (~394 tok)
- `UserAvatar.vue` — Vue: setup (~481 tok)

## apps/web/src/features/issues/composables/

- `useAttachmentUrl.ts` — Fetches an attachment's binary content as an authed blob and exposes a (~351 tok)
- `useIssue.ts` — Server hydrates createdBy + attachments inline on GET /issues/:id. (~573 tok)

## apps/web/src/features/not-found/

- `NotFoundPage.vue` — Vue: setup (~190 tok)

## apps/web/src/features/projects/

- `ProjectsPage.vue` — Vue: setup (~560 tok)

## apps/web/src/features/projects/components/

- `CreateProjectDialog.vue` — Vue: setup (~1440 tok)
- `ProjectCard.vue` — Vue: setup (~199 tok)

## apps/web/src/features/projects/composables/

- `useProjects.ts` — Owns the projects list — fetch, create, in-place prepend on success. (~294 tok)

## apps/web/src/features/projects/utils/

- `slug.ts` — Lower-case, dash-separated, ascii-only. Trims leading/trailing dashes. (~85 tok)

## apps/web/src/features/settings/

- `SettingsPage.vue` — Vue: setup (~695 tok)

## apps/web/src/features/settings/components/

- `Field.vue` — Vue: setup (~131 tok)

## apps/web/src/features/workspace-shell/

- `DashboardLayout.vue` — Vue: setup (~604 tok)

## apps/web/src/layouts/

- `DashboardLayout.vue` — Vue: setup (~599 tok)

## apps/web/src/lib/

- `api.ts` — Pinia-persistedstate stores the auth slice as JSON under "dp_auth". (~379 tok)
- `format.ts` — Exports timeAgo, truncate (~169 tok)
- `mock.ts` — Exports MOCK_ISSUES, MOCK_PROJECTS (~1721 tok)
- `utils.ts` — Exports cn (~49 tok)

## apps/web/src/pages/

- `DashboardPage.vue` — Vue: setup, TS (~2370 tok)
- `ExtensionConnectPage.vue` — Vue: setup (~1353 tok)
- `IssuePage.vue` — Vue: setup (~1498 tok)
- `LoginPage.vue` — Vue: setup (~623 tok)
- `NotFoundPage.vue` — Vue: setup, TS (~127 tok)
- `ProjectsPage.vue` — Vue: setup (~1873 tok)
- `SettingsPage.vue` — Vue: setup, TS (~209 tok)
- `SignupPage.vue` — Vue: setup, TS (~716 tok)

## apps/web/src/router/

- `index.ts` — Declares router (~548 tok)

## apps/web/src/shared/lib/

- `format.ts` — Relative time formatter. Accepts a Date, an ISO 8601 string, or an epoch (~274 tok)

## apps/web/src/stores/

- `auth.ts` — Auth store (~779 tok)

## packages/api/

- `.dev.vars.example` — Cloudflare Worker secrets for `wrangler dev` (--env development). (~131 tok)
- `drizzle.config.ts` — Drizzle ORM configuration (~63 tok)
- `package.json` — Node.js package manifest (~233 tok)
- `tsconfig.json` — TypeScript configuration (~52 tok)
- `wrangler.toml` (~571 tok)

## packages/api/src/

- `index.ts` — API routes: GET (1 endpoints) (~597 tok)

## packages/api/src/db/

- `client.ts` — Exports Db, createDb (~87 tok)
- `schema.ts` — Exports issueModeEnum, issueSourceEnum, issueStatusEnum, severityEnum + 19 more (~6116 tok)

## packages/api/src/lib/

- `env.ts` — Exports Env (~67 tok)
- `jwt.ts` — Exports JwtPayload, signJwt, verifyJwt (~258 tok)
- `response.ts` — Exports ok, err, Errors (~262 tok)

## packages/api/src/middleware/

- `auth.ts` — Exports AuthContext, requireAuth (~270 tok)

## packages/api/src/queues/

- `handlers.ts` — Exports QueueMessage, handleAiQueue, handleIntegrationQueue, handleNotificationQueue (~386 tok)

## packages/api/src/routes/

- `attachments.ts` — API routes: POST, GET (10 endpoints) (~1222 tok)
- `auth.ts` — API routes: POST, GET (3 endpoints) (~941 tok)
- `issues.ts` — API routes: GET, POST (6 endpoints) (~848 tok)
- `projects.ts` — API routes: GET, POST (4 endpoints) (~446 tok)

## packages/shared/

- `package.json` — Node.js package manifest (~84 tok)
- `tsconfig.json` — TypeScript configuration (~34 tok)

## packages/shared/src/

- `enums.ts` — Exports IssueSource, IssueSource, IssueMode, IssueMode + 22 more (~973 tok)
- `index.ts` (~25 tok)
- `schemas.ts` — Zod schemas: SignupSchema, LoginSchema, CreateIssueSchema, UpdateIssueSchema + 14 more (~2665 tok)
- `types.ts` — Exports Org, User, Membership, Project + 17 more (~1689 tok)

## packages/ui/

- `components.json` (~91 tok)
- `package.json` — Node.js package manifest (~187 tok)
- `tailwind.config.ts` — Tailwind CSS configuration (~506 tok)
- `tsconfig.json` — TypeScript configuration (~48 tok)

## packages/ui/src/

- `globals.css` — Styles: 1 rules, 111 vars (~1638 tok)
- `index.ts` — ── Form & interactive ──────────────────────────────────────────────────────── (~1030 tok)

## packages/ui/src/components/icon/

- `Icon.vue` — Vue: setup (~335 tok)
- `index.ts` (~14 tok)

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

## packages/ui/src/components/ui/form/

- `FormControl.vue` — Vue: setup (~193 tok)
- `FormDescription.vue` — Vue: setup (~83 tok)
- `FormField.vue` — Vue: setup (~284 tok)
- `FormItem.vue` — Vue: setup (~81 tok)
- `FormLabel.vue` — Vue: setup (~158 tok)
- `FormMessage.vue` — Vue: setup (~163 tok)
- `index.ts` — Re-export vee-validate's Form helpers and the styled shadcn-vue Field (~168 tok)
- `useFormField.ts` — shadcn-vue Form internals. (~241 tok)

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
