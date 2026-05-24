# Cerebrum

> OpenWolf's learning memory. Updated automatically as the AI learns from interactions.
> Do not edit manually unless correcting an error.
> Last updated: 2026-05-03

## User Preferences

- **RULE — Modular by default:** When creating a feature or any file that is large or can be broken into complementary components, ALWAYS split it into modular pieces from the start. Do not write a monolithic file and refactor later — design it modular up front. Each cohesive unit (visual region, composable, route handler, helper) gets its own file; the top-level file orchestrates. Applies to components, composables, API routes, libs — not just UI. (User reinforced this 2026-05-24.)
- **Component extraction:** Always break UI into small reusable components. Never inline repeated patterns. Follow KISS + DRY — if a pattern is used twice, extract it. Large components must be modularised — each visual region (header, player, timeline, controls) is its own file.
- **Always modularise large component files** — user corrected this explicitly. No monolithic components.
- **Spec review:** Always read SCREEN_RECORDING_SPEC.md before working Phase 4 and LIVE_ANNOTATION_SPEC.md before working Phase 6.
- **Extension popup = launcher only.** The popup captures and launches flows; it never hosts forms, previews, or compose UIs. Post-capture review (screenshot compose, recording review) lives in a full-page modal injected by the content script via shadow DOM.
- **Post-capture modal:** After screenshot capture, popup sends `OPEN_CAPTURE_MODAL` to active tab via `chrome.tabs.sendMessage`. Content script mounts a Vue CaptureModal component in shadow DOM. Popup closes immediately.

<!-- How the user likes things done. Code style, tools, patterns, communication. -->
- **Design system:** Vercel DS — Geist Sans + Geist Mono (variable fonts via `geist` npm package, loaded with `@font-face` in main.css). Color tokens: pure `#000000`/`#fafafa` base, `#eaeaea`/`#333333` borders, `#000000`/`#ededed` text-primary. Accent: violet (`#7c3aed` light, `#8b5cf6` dark).
- **Accent color:** Violet/purple, not blue.
- **Icon usage:** All icons must go through `<Icon name="kebab-case-name" />` (`apps/web/src/components/base/Icon.vue`). No direct lucide imports.
- **Theme toggle:** Dark/light persisted to localStorage key `dp_theme` via `useTheme` composable.

## Key Learnings

- **Project:** deveprobe-report — DevProbe bug reporting platform. Stack: Vue 3 + Vite (web), WXT + Vue 3 (extension), Hono on CF Workers (API), Neon + Drizzle (DB), R2 (storage), CF Queues (async jobs).
- **WXT entrypoints convention:** WXT requires entrypoints in `src/entrypoints/` not `src/popup/`, `src/background/`, `src/content/`. Popup is `src/entrypoints/popup/`, background is `src/entrypoints/background.ts`, content is `src/entrypoints/content.ts`.
- **WXT Vue module name:** The Vue module for WXT is `@wxt-dev/module-vue`, not `@wxt-dev/vue`.
- **PostCSS config in Vite projects:** Use `.js` (not `.ts`) for `postcss.config` — Vite requires `ts-node` for `.ts` PostCSS configs which is not installed by default.
- **Vue 3 + vue-tsc path aliases:** Must declare `baseUrl` + `paths` in `tsconfig.json` for `@/*` alias resolution; also need `env.d.ts` with `/// <reference types="vite/client" />` and `declare module "*.vue"`.
- **Design system tokens:** Deep neutral palette defined as CSS custom properties in `main.css`. Dark mode via `.dark` class on `<html>`. Fonts: Inter (UI), JetBrains Mono (code/technical data). 4px spacing grid.
- **Architectural invariant — timebase:** All timeline events store `timestampMs` from recording start (t=0). Network spans store both `startTimestampMs` and `endTimestampMs`. This must never be violated.
- **Architectural invariant — extension review:** Extension post-recording review must NOT show console/network/error tabs. Full correlation UI lives exclusively in `/issue/[id]`.

## Do-Not-Repeat

<!-- Mistakes made and corrected. Each entry prevents the same mistake recurring. -->
<!-- Format: [YYYY-MM-DD] Description of what went wrong and what to do instead. -->

- [2026-05-20] **NEVER create a git worktree for this project — always work directly on the `dev` branch.** The user has corrected this multiple times. Skip `EnterWorktree` / `isolation: "worktree"` entirely. If a session starts inside a stale worktree, do the work where you are but DO NOT create new ones.
- [2026-05-20] **Always update `apps/web/src/app/router.ts` when adding/renaming an issue page component.** The router uses `pages/issues/Issue.vue`, not `features/issues/IssuePage.vue`. Refactoring `IssuePage.vue` without re-pointing the route means the new UI is never rendered. Either repoint the route or write into `Issue.vue` directly.
- [2026-05-03] **Never register chrome.runtime.onMessage AFTER an await in a content script main().** Messages sent during async init are silently dropped. Register all listeners as the very first synchronous operations in main().
- [2026-05-03] **Never use manual attachShadow() for Vue components injected by WXT content scripts.** Vue scoped CSS gets injected into `<head>`, not the shadow root — components render completely unstyled. Always use createShadowRootUi() so WXT injects content.css into the shadow root correctly.
- [2026-05-03] **WXT shadow host must be styled after mount.** After createShadowRootUi().mount(), call styleHost(ui) to set `position:fixed;top:0;left:0;width:0;height:0;overflow:visible;pointer-events:none` on the host element. Without this, the custom element is a block in the page flow and pushes content.
- [2026-05-03] **pointer-events:none on shadow host is inherited.** Add `pointer-events:auto` to the root CSS class of every interactive overlay component (RegionSelector .dp-rs, PostComposeModal .dp-modal-overlay, FAB .dp-fab). Without this, clicks don't reach the shadow DOM.
- [2026-05-03] **PostComposeModal is headless** — it accepts a `#media` slot (left panel) and `#success` slot, emits `submit(form)` and `cancel`. ScreenshotCapture plugs in ScreenshotPanel; future VideoCapture will plug in VideoPanel. Never add screenshot/video-specific logic to PostComposeModal itself.
- [2026-05-03] **Screenshot flow**: popup → FORWARD_TO_CONTENT(START_REGION_SELECT) → popup closes → content mounts RegionSelector → user drags region → content sends CAPTURE_VISIBLE_TAB to background → crops with canvas → mounts ScreenshotCapture modal.
- [2026-05-03] **Never call chrome.tabs in a content script.** `chrome.tabs` (query, captureVisibleTab, sendMessage) is only available in background service workers. Content scripts send messages to background and use the returned data. Background already returns `tab` in CAPTURE_VISIBLE_TAB response — use `res.tab`.
- [2026-05-03] **Tailwind in shadow DOM requires darkMode:'media'.** The `.dark` class strategy won't work because the host page's class doesn't propagate into the shadow root. Use `darkMode: 'media'` so `dark:` utilities respond to `prefers-color-scheme`.
- [2026-05-03] **content.css must be imported in content.ts for WXT to bundle Tailwind utilities into shadow roots.** Importing only in popup/main.ts leaves all shadow DOM components unstyled.
- [2026-05-03] **Extension capture components are folder-separated by media type.** Screenshot components live in `components/capture/screenshot/`, screen recording in `components/capture/recording/`. Shared modal shell (PostComposeModal) stays in `components/capture/`.
- [2026-05-04] **Annotation drawing is shape-based, not raster.** `useAnnotationCanvas` stores every drawn item in `shapes: Shape[]` and replays them on every redraw. This is required for the select tool to hit-test/highlight/delete individual items, and makes undo/redo memory-cheap (Shape[][] history instead of ImageData[]). Never go back to ImageData snapshots for undo.
- [2026-05-04] **Blur tool samples from the original screenshot, not the canvas.** `drawBlur` uses `screenshotImg` as the source so repeated redraws don't compound the blur. The pixelation is idempotent.
- [2026-05-04] **Toolbar tooltips use a tiny `ToolbarTip.vue` wrapper, not native `title`.** Native browser tooltips don't render reliably inside shadow DOM. The wrapper shows a custom dark pill above the slot on hover with a 180ms delay.
- [2026-05-04] **PostComposeModal backdrop must have `@click.self.stop` AND modal shell must have `@click.stop`.** Without both, stray click events bubble to whatever mounted the modal and may trigger unmount. Without the `@mousedown.stop` companion, drag-then-release outside the modal can also close it.

## Decision Log

<!-- Significant technical decisions with rationale. Why X was chosen over Y. -->

- [2026-05-04] **UI library: shadcn-vue in packages/ui** over hand-rolled Dp* components. User explicitly requested shadcn-vue. Components live in `packages/ui/src/components/ui/<name>/`, generated by the CLI (`pnpm dlx shadcn-vue@latest add <component>`), re-exported via `packages/ui/src/index.ts`. Uses `reka-ui` (successor to radix-vue) + CVA.

- [2026-05-04] **shadcn-vue CSS variables mapped to Claude palette** via HSL values in `packages/ui/src/globals.css`. Light: `--primary: 262 84% 58%` (purple #7c3aed), warm backgrounds. Dark: `--primary: 262 72% 65%` (#8b5cf6). Extension also gets the bridge in `apps/extension/src/assets/main.css`.

- [2026-05-10] **Single CSS token source: `packages/ui/src/globals.css`**. All apps do `@import '@deveprobe/ui/src/globals.css'` at the top of their main CSS. The file contains shadcn HSL tokens + legacy surface tokens + neutral 50–950 scale + shadows. App CSS files only add fonts, html/body base, scrollbars, and app-specific components. Never duplicate tokens across app CSS files.

- [2026-05-10] **Neutral colour scale added** — `--neutral-50` through `--neutral-950` in `globals.css`, warm stone HSL values that map exactly to the existing palette (50=off-white, 100=bg-base, 500=border-strong, 950=text-primary). Static — not redefined in `.dark`.

- [2026-05-04] **Extension shadow DOM: avoid Radix/reka-ui portal components**. Radix Select/Dialog/Popover/DropdownMenu teleport content to `<body>`, escaping the shadow root and losing all CSS. For shadow DOM components (PostComposeModal, FloatingLauncher), use: Button ✓ Badge ✓ Input ✓ Textarea ✓ — but keep native `<select>` instead of shadcn Select, and avoid Dialog/Popover/DropdownMenu. Popup components (non-shadow-DOM) can use the full shadcn suite.
- [2026-05-10] **shadcn Select IS usable in shadow DOM** via the `to` prop added to `SelectContent` in `packages/ui`. Pass `:to="shadowRoot"` where `shadowRoot = rootEl.getRootNode()`. The `to` prop forwards to `SelectPortal`, defaulting to `'body'` for the web app. No wrapper component needed.

## Key Learnings (added 2026-05-04)
- Claude design system palette: light bg #F5F5F0 (warm beige), dark bg #2B2A27; borders #DDD9CE (warm); active:scale-[0.98] on all interactive elements
- @apply in Tailwind CSS cannot use arbitrary-value classes with opacity modifiers (e.g. focus-visible:ring-[var(--accent)]/60) — must inline those or use plain focus-visible:ring-2
- button `border` in CVA base class bleeds into all variants and creates "elevated/shadowed" look — only add border to specific variants that need it (outline, secondary)
- [2026-05-10] **Browser default `<button>` styles show in shadow DOM** — fix with `@tailwind base` in content.css. A bare `button { border: 0 }` after tailwind directives overrides outline variant border because unlayered CSS beats `@layer utilities`.
- [2026-05-10] **Never import reka-ui types in `defineEmits<>` inside extension components** — reka-ui not a direct dep of extension; SFC compiler fails cross-package type resolution. Use local emit interface instead.
- [2026-05-10] **SelectItem hover = `focus:bg-secondary focus:text-foreground`**, not `focus:bg-accent` — accent is solid purple and too heavy for hover states.
