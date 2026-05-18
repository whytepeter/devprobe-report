/**
 * Content script — mounts three possible UIs into the page via shadow DOM:
 *
 * 1. FloatingLauncher  — permanent FAB in the bottom-right corner.
 * 2. RegionSelector    — full-page overlay for dragging a capture region.
 *                        Mounted on START_REGION_SELECT, unmounted after selection.
 * 3. ScreenshotCapture — two-panel compose modal (screenshot + annotation + form).
 *                        Mounted after the region is captured and cropped.
 *
 * All UIs use WXT's createShadowRootUi so the extension CSS is scoped to each
 * shadow root and never leaks into the host page.
 *
 * IMPORTANT: All chrome.runtime.onMessage listeners are registered BEFORE any
 * awaits so they can never miss a message sent during async initialisation.
 */
import '../assets/content.css';
import { createApp, ref, h } from 'vue';
import FloatingLauncher  from '../components/launcher/FloatingLauncher.vue';
import RegionSelector    from '../components/capture/RegionSelector.vue';
import ScreenshotCapture   from '../components/capture/screenshot/ScreenshotCapture.vue';
import RecordingCapture    from '../components/capture/recording/RecordingCapture.vue';
import RecordingControlBar from '../components/capture/recording/toolbar/RecordingControlBar.vue';
import { getTheme, applyThemeClass, onThemeChange } from '../lib/theme.js';
import { startCaptureStreams, type CaptureStreams } from '../lib/capture-streams.js';
import { createElementBlur } from '../lib/element-blur.js';
import type { UploadedTimelineEvent } from '../lib/api.js';
import type { BrowserMeta } from '@deveprobe/shared';
import type { StoredAuth }  from '../lib/auth.js';
import type { RegionBounds } from '../components/capture/RegionSelector.vue';

export default defineContentScript({
  matches:          ['<all_urls>'],
  runAt:            'document_idle',
  cssInjectionMode: 'ui',

  async main(ctx) {
    let regionUi:    Awaited<ReturnType<typeof createShadowRootUi>> | null = null;
    let captureUi:   Awaited<ReturnType<typeof createShadowRootUi>> | null = null;
    let recordingUi: Awaited<ReturnType<typeof createShadowRootUi>> | null = null;

    // Track all active shadow-root containers so theme changes propagate live
    const themeTargets = new Set<HTMLElement>();

    // Apply current stored theme to a container and register it for live updates
    async function initTheme(container: HTMLElement) {
      const theme = await getTheme();
      applyThemeClass(container, theme);
      themeTargets.add(container);
    }

    // Watch for theme changes (popup toggle) and update all mounted shadow roots
    onThemeChange((theme) => {
      for (const el of themeTargets) applyThemeClass(el, theme);
    });

    // ── Listeners registered FIRST (before any awaits) ──────────────────────
    chrome.runtime.onMessage.addListener((msg) => {
      switch (msg?.type) {
        case 'START_REGION_SELECT':
          startRegionSelect(msg.auth ?? null);
          break;

        case 'START_RECORDING':
          startRecording(msg.auth ?? null);
          break;

        case 'STOP_RECORDING':
          window.dispatchEvent(new CustomEvent('dp:stop-recording'));
          break;

        // Direct open path (e.g. future headless capture flows)
        case 'OPEN_CAPTURE_MODAL':
          openCaptureModal(msg.dataUrl, msg.browserMeta, msg.auth ?? null);
          break;
      }
    });

    // FAB dispatches this when Screenshot is clicked — triggers region select
    window.addEventListener('dp:start-region-select', async () => {
      try {
        const { getAuth } = await import('../lib/auth.js');
        const auth = await getAuth();
        startRegionSelect(auth);
      } catch {
        // Extension was reloaded — orphaned content script. The user needs to refresh the page.
      }
    });

    // FAB dispatches this when Record is clicked — triggers screen recording
    window.addEventListener('dp:start-recording', async () => {
      try {
        const { getAuth } = await import('../lib/auth.js');
        const auth = await getAuth();
        startRecording(auth);
      } catch {
        // Extension was reloaded — orphaned content script.
      }
    });

    // ── Floating launcher (permanent) ────────────────────────────────────────
    const launcherUi = await createShadowRootUi(ctx, {
      name:     'dp-launcher',
      position: 'inline',
      anchor:   'body',
      onMount(container) {
        initTheme(container);
        const app = createApp(FloatingLauncher);
        app.mount(container);
        return app;
      },
      onRemove(app, container) {
        themeTargets.delete(container as HTMLElement);
        app?.unmount();
      },
    });
    launcherUi.mount();
    // Pin the host to the viewport corner so the FAB inside always receives
    // clicks even if the host page wraps body in a transformed container
    // (which breaks position:fixed for descendants). pointer-events:none
    // means the host itself never blocks the host page; only the FAB's own
    // auto rules capture clicks.
    {
      const host = document.querySelector('dp-launcher') as HTMLElement | null;
      if (host) {
        host.style.position = 'fixed';
        host.style.bottom = '0';
        host.style.right = '0';
        host.style.zIndex = '2147483647';
        host.style.pointerEvents = 'none';
      }
    }

    // ── Region selector ───────────────────────────────────────────────────────
    // Mounts a full-page drag overlay; on confirm, captures + crops the region.
    async function startRegionSelect(auth: StoredAuth | null) {
      if (regionUi) { regionUi.remove(); regionUi = null; }

      regionUi = await createShadowRootUi(ctx, {
        name:     'dp-region-selector',
        position: 'modal',
        onMount(container) {
          // Elevate the shadow host above any host-page modals (z-index:9999 etc.)
          const host = (container.getRootNode() as ShadowRoot).host as HTMLElement;
          host.style.zIndex = '2147483647';
          initTheme(container);
          const app = createApp(RegionSelector, {
            onSelected: async (bounds: RegionBounds) => {
              unmountRegion();
              await captureRegion(bounds, auth);
            },
            onCancel: () => unmountRegion(),
          });
          app.mount(container);
          return app;
        },
        onRemove(app, container) {
          themeTargets.delete(container as HTMLElement);
          app?.unmount();
        },
      });
      regionUi.mount();
    }

    function unmountRegion() {
      regionUi?.remove();
      regionUi = null;
    }

    // ── Capture & crop ────────────────────────────────────────────────────────
    async function captureRegion(bounds: RegionBounds, auth: StoredAuth | null) {
      const res = await chrome.runtime.sendMessage({ type: 'CAPTURE_VISIBLE_TAB' });
      if (!res?.ok) {
        console.error('[DevProbe] capture failed:', res?.error);
        return;
      }

      const croppedDataUrl = await cropImage(res.dataUrl, bounds);

      // res.tab is returned by the background — chrome.tabs is NOT available in content scripts
      const { collectBrowserMeta } = await import('../lib/metadata.js');
      const meta = res.tab ? await collectBrowserMeta(res.tab) : ({} as BrowserMeta);

      openCaptureModal(croppedDataUrl, meta, auth);
    }

    /**
     * Crops a full-tab screenshot (PNG data URL) to the CSS-pixel selection bounds.
     * captureVisibleTab captures at devicePixelRatio scale, so we scale the bounds up.
     */
    async function cropImage(dataUrl: string, bounds: RegionBounds): Promise<string> {
      const dpr = window.devicePixelRatio || 1;
      const img = new Image();
      img.src = dataUrl;
      await img.decode();

      const x = Math.round(bounds.x * dpr);
      const y = Math.round(bounds.y * dpr);
      const w = Math.round(bounds.w * dpr);
      const h = Math.round(bounds.h * dpr);

      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, x, y, w, h, 0, 0, w, h);
      return canvas.toDataURL('image/png');
    }

    // ── Capture modal ─────────────────────────────────────────────────────────
    async function openCaptureModal(
      dataUrl:     string,
      browserMeta: BrowserMeta,
      auth:        StoredAuth | null,
    ) {
      if (captureUi) { captureUi.remove(); captureUi = null; }

      captureUi = await createShadowRootUi(ctx, {
        name:     'dp-capture-modal',
        position: 'modal',
        onMount(container) {
          const host = (container.getRootNode() as ShadowRoot).host as HTMLElement;
          host.style.zIndex = '2147483647';
          initTheme(container);
          const app = createApp(ScreenshotCapture, {
            screenshotDataUrl: dataUrl,
            browserMeta,
            auth,
            onClose: () => {
              captureUi?.remove();
              captureUi = null;
            },
            onAnother: () => {
              captureUi?.remove();
              captureUi = null;
              startRegionSelect(auth);
            },
          });
          app.mount(container);
          return app;
        },
        onRemove(app, container) {
          themeTargets.delete(container as HTMLElement);
          app?.unmount();
        },
      });
      captureUi.mount();
    }

    // ── Screen recording ──────────────────────────────────────────────────────
    // Implements the relevant parts of SCREEN_RECORDING_SPEC.md:
    // - Floating capture controls (timer, pause/resume, stop, add marker)
    // - 5-minute default cap
    // - Hide our FAB during the recording so it doesn't appear in the video
    // - Single timebase (`performance.now() - startedAt`) for all timeline events
    // - Collect markers from errors, unhandled rejections, user actions, long tasks
    // - On stop → mount RecordingCapture review modal with markers + duration
    const MAX_RECORDING_MS = 5 * 60 * 1000;

    let controlBarUi: Awaited<ReturnType<typeof createShadowRootUi>> | null = null;

    /**
     * Request a tab MediaStream ID from the background SW, then consume it
     * via the non-standard `chromeMediaSource:'tab'` constraint to produce
     * a MediaStream WITHOUT any picker UI.
     *
     * Requires the user gesture to have originated in an extension context
     * (popup click forwards through FORWARD_TO_CONTENT) — Chrome rejects
     * tabCapture when the gesture comes from regular page JS.
     */
    async function acquireTabStream(): Promise<MediaStream> {
      const res = await chrome.runtime.sendMessage({ type: 'GET_TAB_STREAM_ID' }) as
        | { ok: true; streamId: string }
        | { ok: false; error: string }
        | undefined;
      if (!res || !('ok' in res) || !res.ok) {
        throw new Error(res && 'error' in res ? res.error : 'tabCapture unavailable');
      }
      // Chrome-specific constraint shape — declared via `any` because the lib
      // dom types don't model the legacy mandatory/optional grammar.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource:   'tab',
            chromeMediaSourceId: res.streamId,
          },
        } as unknown as MediaTrackConstraints,
      });
    }

    async function startRecording(auth: StoredAuth | null) {
      // Skip the OS-level screen picker entirely. The popup→background path
      // mints a chrome.tabCapture stream ID for the active tab; the content
      // script then consumes it via the non-standard `chromeMediaSource:'tab'`
      // constraint to getUserMedia. If that fails for any reason (no gesture,
      // restricted tab, older Chrome) we fall back to getDisplayMedia so the
      // user can still pick manually.
      let stream: MediaStream;
      try {
        stream = await acquireTabStream();
      } catch (e) {
        console.warn('[DevProbe] tabCapture failed, falling back to picker:', e);
        try {
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: { frameRate: 30 },
            audio: false,
          });
        } catch (err) {
          console.warn('[DevProbe] recording cancelled or blocked:', err);
          return;
        }
      }

      // Hide our FAB so it never appears in the recording (spec: avoid recording overlay controls).
      const launcherHost = document.querySelector('dp-launcher') as HTMLElement | null;
      const prevDisplay  = launcherHost?.style.display ?? '';
      if (launcherHost) launcherHost.style.display = 'none';

      // Signal to the popup that a recording is active. The popup polls this
      // storage key to swap into the "Recording in progress" UI.
      try {
        await chrome.storage.local.set({
          'dp:recording': { startedAt: Date.now(), pageUrl: location.href },
        });
      } catch { /* storage unavailable */ }

      const startedAt = performance.now();
      const chunks:   Blob[]   = [];
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

      // Capture observable timeline events (errors, clicks, navigations, long tasks).
      const streams: CaptureStreams = startCaptureStreams(startedAt);

      // State held in refs the control bar reads via its mounted Vue app.
      let elapsedMs = 0;
      let state: 'recording' | 'paused' = 'recording';
      let tickInterval: ReturnType<typeof setInterval> | null = null;
      let stopTimer:    ReturnType<typeof setTimeout>  | null = null;
      let appHandle: { setState: (s: 'recording' | 'paused') => void; setElapsed: (ms: number) => void } | null = null;

      // Auto-stop at 5 minutes.
      stopTimer = setTimeout(() => stopRecording(), MAX_RECORDING_MS);

      // Tick the visible timer every 200ms while recording (not while paused).
      tickInterval = setInterval(() => {
        if (state === 'recording') {
          elapsedMs = Math.min(MAX_RECORDING_MS, Math.round(performance.now() - startedAt));
          appHandle?.setElapsed(elapsedMs);
        }
      }, 200);

      function togglePause() {
        if (state === 'recording') {
          recorder.pause();
          state = 'paused';
        } else {
          recorder.resume();
          state = 'recording';
        }
        appHandle?.setState(state);
      }

      // ── Blur picker ──────────────────────────────────────────────────────
      // Element-targeted blur (CSS filter:blur on the actual element). The
      // blur scrolls with the page and is captured by the screen-capture
      // stream because it's real rendered CSS — no fixed overlay.
      const elementBlur = createElementBlur();

      function startBlurPicker() {
        const controlHost = document.querySelector('dp-recording-control') as HTMLElement | null;
        const prevControlDisplay = controlHost?.style.display ?? '';
        elementBlur.pickAndBlur({
          onBeforePick: () => { if (controlHost) controlHost.style.display = 'none'; },
          onAfterPick:  () => { if (controlHost) controlHost.style.display = prevControlDisplay; },
        });
      }

      async function stopRecording() {
        if (recorder.state === 'inactive') return;
        if (tickInterval) clearInterval(tickInterval);
        if (stopTimer)    clearTimeout(stopTimer);
        try { recorder.stop(); } catch { /* already stopped */ }
      }

      recorder.onstop = async () => {
        const durationMs = Math.round(performance.now() - startedAt);
        stream.getTracks().forEach(t => t.stop());

        // Restore FAB + tear down control bar
        if (launcherHost) launcherHost.style.display = prevDisplay;
        controlBarUi?.remove(); controlBarUi = null;

        // Strip every element blur we applied — they shouldn't outlive the recording.
        elementBlur.restoreAll();

        // Detach the popup → content stop-recording bridge.
        window.removeEventListener('dp:stop-recording', stopRecording);
        window.removeEventListener('beforeunload',     onBeforeUnload);

        // Clear the active-recording signal for the popup.
        try { await chrome.storage.local.remove('dp:recording'); } catch { /* ignore */ }

        // `stop()` returns BOTH the trimmer's markers (warnings + errors only)
        // and the full event stream (uploaded to /issues/:id/events for the
        // issue details page).
        const { markers, events } = streams.stop();
        const blob    = new Blob(chunks, { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);
        const meta    = collectBrowserMetaFromPage();
        const startedIso = new Date(Date.now() - durationMs).toISOString();
        const stoppedIso = new Date().toISOString();

        openRecordingModal(blobUrl, durationMs, markers, events, meta, auth, {
          startedAt: startedIso,
          stoppedAt: stoppedIso,
        });
      };

      // User clicked the browser's "Stop sharing" button → finalise.
      stream.getVideoTracks()[0]?.addEventListener('ended', () => stopRecording());

      // Popup → content bridge for the "Stop" button rendered in the popup.
      window.addEventListener('dp:stop-recording', stopRecording);

      // Warn before navigation: refreshing or closing the tab destroys the JS
      // context that owns the MediaRecorder, losing the in-flight recording.
      const onBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };
      window.addEventListener('beforeunload', onBeforeUnload);

      recorder.start(250); // 250ms chunks → quick first byte if upload starts mid-stream later

      // Mount the floating control bar in its own shadow root.
      controlBarUi = await createShadowRootUi(ctx, {
        name:     'dp-recording-control',
        position: 'inline',
        anchor:   'body',
        onMount(container) {
          const host = (container.getRootNode() as ShadowRoot).host as HTMLElement;
          host.style.position      = 'fixed';
          host.style.inset         = '0';
          host.style.pointerEvents = 'none';
          host.style.zIndex        = '2147483646';
          initTheme(container);

          const stateRef   = ref<'recording' | 'paused'>('recording');
          const elapsedRef = ref(0);

          const app = createApp({
            setup() {
              return () =>
                h(RecordingControlBar, {
                  state:         stateRef.value,
                  elapsedMs:     elapsedRef.value,
                  onTogglePause: () => togglePause(),
                  onAddBlur:     () => startBlurPicker(),
                  onStop:        () => stopRecording(),
                });
            },
          });
          app.mount(container);

          appHandle = {
            setState:   (s) => { stateRef.value   = s; },
            setElapsed: (ms) => { elapsedRef.value = ms; },
          };
          return app;
        },
        onRemove(app, container) {
          themeTargets.delete(container as HTMLElement);
          app?.unmount();
        },
      });
      controlBarUi.mount();
    }

    // Content-script-side BrowserMeta (no chrome.scripting access here).
    function collectBrowserMetaFromPage(): BrowserMeta {
      const ua = navigator.userAgent;
      return {
        userAgent:         ua,
        browser:           /Chrome/.test(ua) ? 'Chrome' : /Firefox/.test(ua) ? 'Firefox' : 'Unknown',
        browserVersion:    (ua.match(/(?:Chrome|Firefox|Safari)\/([\d.]+)/) ?? [, ''])[1] ?? '',
        os:                /Mac/.test(ua) ? 'macOS' : /Win/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : 'Unknown',
        osVersion:         '',
        deviceType:        'desktop',
        viewport:          { width: window.innerWidth, height: window.innerHeight },
        screenSize:        { width: window.screen.width, height: window.screen.height },
        devicePixelRatio:  window.devicePixelRatio,
        timezone:          Intl.DateTimeFormat().resolvedOptions().timeZone,
        language:          navigator.language,
        colorScheme:       window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark'
                          : window.matchMedia('(prefers-color-scheme: light)').matches ? 'light'
                          : 'no-preference',
        pageUrl:           location.href,
        pageTitle:         document.title,
        releaseVersion:    (document.querySelector('meta[name="release-version"]') as HTMLMetaElement | null)?.content ?? null,
        commitSha:         (document.querySelector('meta[name="commit-sha"]') as HTMLMetaElement | null)?.content ?? null,
        buildId:           (document.querySelector('meta[name="build-id"]') as HTMLMetaElement | null)?.content ?? null,
        featureFlags:      {},
        networkType:       null,
      };
    }

    async function openRecordingModal(
      videoBlobUrl: string,
      durationMs:   number,
      markers:      Array<{ id: string; timestampMs: number; type: string; label?: string }>,
      events:       UploadedTimelineEvent[],
      browserMeta:  BrowserMeta,
      auth:         StoredAuth | null,
      session:      { startedAt: string; stoppedAt: string },
    ) {
      if (recordingUi) { recordingUi.remove(); recordingUi = null; }

      recordingUi = await createShadowRootUi(ctx, {
        name:     'dp-recording-modal',
        position: 'modal',
        onMount(container) {
          const host = (container.getRootNode() as ShadowRoot).host as HTMLElement;
          host.style.zIndex = '2147483647';
          initTheme(container);
          const app = createApp(RecordingCapture, {
            videoBlobUrl,
            durationMs,
            markers,
            events,
            session,
            browserMeta,
            auth,
            onClose: () => {
              URL.revokeObjectURL(videoBlobUrl);
              recordingUi?.remove();
              recordingUi = null;
            },
          });
          app.mount(container);
          return app;
        },
        onRemove(app, container) {
          themeTargets.delete(container as HTMLElement);
          app?.unmount();
        },
      });
      recordingUi.mount();
    }
  },
});
