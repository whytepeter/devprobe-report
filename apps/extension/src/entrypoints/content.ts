/**
 * Content script — mounts UIs into the page via shadow DOM:
 *
 * 1. FloatingLauncher    — permanent FAB in the bottom-right corner.
 * 2. RegionSelector      — full-page overlay for dragging a capture region.
 * 3. ScreenshotCapture   — compose modal (screenshot + annotation + form).
 * 4. RecordingControlBar — floating toolbar during screen recording.
 *                          Mounted on RECORDING_STARTED (from background) or on
 *                          init when a recording was already active before this page
 *                          loaded (reload/navigate recovery).
 * 5. RecordingCapture    — review modal opened when recording finalises.
 *
 * The MediaRecorder lives in the offscreen document (entrypoints/offscreen/main.ts)
 * and survives tab reloads and navigation. This script is a thin client:
 * mount toolbar → collect per-page timeline events → open review modal on RECORDING_FINALISED.
 *
 * IMPORTANT: All chrome.runtime.onMessage listeners are registered BEFORE any
 * awaits so they can never miss a message sent during async initialisation.
 */
import '../assets/content.css';
import { createApp, ref, watch } from 'vue';
import FloatingLauncher    from '../components/launcher/FloatingLauncher.vue';
import RegionSelector      from '../components/capture/RegionSelector.vue';
import ScreenshotCapture   from '../components/capture/screenshot/ScreenshotCapture.vue';
import RecordingCapture    from '../components/capture/recording/RecordingCapture.vue';
import AnnotationOverlay   from '../components/capture/annotation/AnnotationOverlay.vue';
import { useRecordingState } from '../lib/recording-state.js';
import RecordingResumeBanner from '../components/capture/recording/toolbar/RecordingResumeBanner.vue';
import { getTheme, applyThemeClass, onThemeChange } from '../lib/theme.js';
import { startCaptureStreams, type CaptureStreams } from '../lib/capture-streams.js';
import { createElementBlur } from '../lib/element-blur.js';
import type { UploadedTimelineEvent } from '../lib/api.js';
import type { BrowserMeta } from '@deveprobe/shared';
import type { StoredAuth }  from '../lib/auth.js';
import type { RegionBounds } from '../components/capture/RegionSelector.vue';
import type { RecordingMarker } from '../components/capture/recording/types.js';

interface SegmentBlob {
  base64:     string;
  mimeType:   string;
  durationMs: number;
}

interface FinalisedMsg {
  segments:       SegmentBlob[];
  startedAtEpoch: number;
  stoppedAtEpoch: number;
  pageUrl:        string;
}

export default defineContentScript({
  matches:          ['<all_urls>'],
  runAt:            'document_idle',
  cssInjectionMode: 'ui',

  async main(ctx) {
    let regionUi:     Awaited<ReturnType<typeof createShadowRootUi>> | null = null;
    let captureUi:    Awaited<ReturnType<typeof createShadowRootUi>> | null = null;
    let recordingUi:  Awaited<ReturnType<typeof createShadowRootUi>> | null = null;
    let annotationUi: Awaited<ReturnType<typeof createShadowRootUi>> | null = null;
    // Recording controls now live in the FloatingLauncher (it transforms into
    // the toolbar). The content script owns the recorder lifecycle via these
    // module-scoped handles instead of a separate shadow UI.
    let recTick:        ReturnType<typeof setInterval> | null = null;
    let recElementBlur: ReturnType<typeof createElementBlur> | null = null;
    let recUnwatchers:  Array<() => void> = [];
    let resumeUi:     Awaited<ReturnType<typeof createShadowRootUi>> | null = null;
    let captureStreams: CaptureStreams | null = null;

    const themeTargets = new Set<HTMLElement>();

    async function initTheme(container: HTMLElement) {
      const theme = await getTheme();
      applyThemeClass(container, theme);
      themeTargets.add(container);
    }

    onThemeChange((theme) => {
      for (const el of themeTargets) applyThemeClass(el, theme);
    });

    // Hide the FloatingLauncher (FAB) whenever a BLOCKING capture surface is
    // mounted — region selector, capture modal, recording toolbar, or review
    // modal. Annotation is deliberately EXCLUDED: during annotation the
    // launcher IS the toolbar (pin count + "+ Pin" / Done controls), so it
    // must stay visible.
    function syncLauncherVisibility() {
      const anyBlocking =
        !!regionUi || !!captureUi || !!recordingUi || !!resumeUi;
      const host = document.querySelector('dp-launcher') as HTMLElement | null;
      if (host) host.style.display = anyBlocking ? 'none' : '';
    }

    // ── Listeners registered FIRST (before any awaits) ──────────────────────
    chrome.runtime.onMessage.addListener((msg) => {
      switch (msg?.type) {
        case 'START_REGION_SELECT':
          startRegionSelect(msg.auth ?? null);
          break;

        case 'START_ANNOTATION':
          // Popup → background → content. Use the same lazy auth lookup so
          // we don't require the popup to ship a token in the payload.
          void (async () => {
            const { getAuth } = await import('../lib/auth.js');
            const auth = await getAuth();
            await startAnnotation(auth);
          })();
          break;

        case 'OPEN_CAPTURE_MODAL':
          openCaptureModal(msg.dataUrl, msg.browserMeta, msg.auth ?? null);
          break;

        // Background → content: recording has started (or re-started on a new page)
        case 'RECORDING_STARTED':
          void mountControlBar(msg.startedAtEpoch as number);
          break;

        // Background → content: blob ready, open review modal
        case 'RECORDING_FINALISED':
          void handleRecordingFinalised(msg as FinalisedMsg);
          break;
      }
    });

    // FAB → screenshot: dispatched by FloatingLauncher via window event
    window.addEventListener('dp:start-region-select', async () => {
      try {
        const { getAuth } = await import('../lib/auth.js');
        const auth = await getAuth();
        startRegionSelect(auth);
      } catch {
        // Extension was reloaded — orphaned content script
      }
    });

    // FAB → recording: tell background to run the offscreen recording flow
    window.addEventListener('dp:start-recording', () => {
      chrome.runtime.sendMessage({ type: 'START_RECORDING_FLOW' }).catch(() => null);
    });

    // FAB → annotation: mount the live-annotation overlay.
    window.addEventListener('dp:start-annotation', async () => {
      try {
        const { getAuth } = await import('../lib/auth.js');
        const auth = await getAuth();
        await startAnnotation(auth);
      } catch {
        // Extension was reloaded — orphaned content script
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
    // Pin host to viewport corner; pointer-events:none so it never blocks the page
    {
      const host = document.querySelector('dp-launcher') as HTMLElement | null;
      if (host) {
        host.style.position      = 'fixed';
        host.style.bottom        = '0';
        host.style.right         = '0';
        host.style.zIndex        = '2147483647';
        host.style.pointerEvents = 'none';
      }
    }

    // Recover from a recording that was in progress when this page loaded:
    //   - status: 'active'      → re-mount the live toolbar (rare; happens
    //                              only if the stream survived the reload —
    //                              Chrome doesn't normally allow this).
    //   - status: 'interrupted' → mount a Resume banner. Clicking it provides
    //                              the user gesture chrome.tabCapture needs.
    try {
      const res = await chrome.runtime.sendMessage({ type: 'GET_RECORDING_STATE' });
      const state = res?.ok ? res.state : null;
      if (state?.status === 'interrupted') {
        await mountResumeBanner(state.startedAtEpoch as number);
      } else if (state?.startedAtEpoch) {
        await mountControlBar(state.startedAtEpoch as number);
      }
    } catch { /* orphaned or storage unavailable */ }

    // ── Region selector ───────────────────────────────────────────────────────
    async function startRegionSelect(auth: StoredAuth | null) {
      if (regionUi) { regionUi.remove(); regionUi = null; }

      regionUi = await createShadowRootUi(ctx, {
        name:     'dp-region-selector',
        position: 'modal',
        onMount(container) {
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
      syncLauncherVisibility();
    }

    function unmountRegion() {
      regionUi?.remove();
      regionUi = null;
      syncLauncherVisibility();
    }

    // ── Annotation overlay ────────────────────────────────────────────────────
    // Idempotent: re-clicking "Annotate" while the overlay is up is a no-op.
    // We collect browser meta the same way the screenshot flow does so the
    // anchor + viewport snapshot land consistently on the issue.
    async function startAnnotation(auth: StoredAuth | null) {
      if (annotationUi) return; // already up

      const meta = collectBrowserMetaFromPage();

      annotationUi = await createShadowRootUi(ctx, {
        name:     'dp-annotation',
        position: 'modal',
        onMount(container) {
          const host = (container.getRootNode() as ShadowRoot).host as HTMLElement;
          // ONE BELOW the launcher (2147483647) so the FAB — which IS the
          // annotation toolbar now — stays clickable on top of the overlay.
          host.style.zIndex = '2147483646';
          // Host is inert; the overlay's inner pins / composer / capture-layer
          // opt back in with pointer-events:auto. Without this the modal host
          // would swallow every click and the page (+ FAB) would be dead.
          host.style.pointerEvents = 'none';
          initTheme(container);
          const app = createApp(AnnotationOverlay, {
            browserMeta: meta,
            auth,
            onClose: () => {
              annotationUi?.remove();
              annotationUi = null;
              syncLauncherVisibility();
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
      annotationUi.mount();
      syncLauncherVisibility();
    }

    // ── Capture & crop ────────────────────────────────────────────────────────
    async function captureRegion(bounds: RegionBounds, auth: StoredAuth | null) {
      const res = await chrome.runtime.sendMessage({ type: 'CAPTURE_VISIBLE_TAB' });
      if (!res?.ok) {
        console.error('[DevProbe] capture failed:', res?.error);
        return;
      }
      const croppedDataUrl = await cropImage(res.dataUrl, bounds);
      const { collectBrowserMeta } = await import('../lib/metadata.js');
      const meta = res.tab ? await collectBrowserMeta(res.tab) : ({} as BrowserMeta);
      openCaptureModal(croppedDataUrl, meta, auth);
    }

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

    // ── Screenshot compose modal ──────────────────────────────────────────────
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
              syncLauncherVisibility();
            },
            onAnother: () => {
              captureUi?.remove();
              captureUi = null;
              syncLauncherVisibility();
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
      syncLauncherVisibility();
    }

    // ── Recording controls (driven through the FloatingLauncher) ──────────────
    // The launcher transforms into the recording toolbar. The content script
    // owns the recorder lifecycle: capture-streams, the live timer, element
    // blur, and the command bridge to the offscreen document. It publishes
    // state to `recording-state` and watches the launcher's intents.
    async function mountControlBar(startedAtEpoch: number) {
      tearDownRecordingControls();        // clean slate (covers reload re-mounts)
      captureStreams?.stop(); captureStreams = null;

      // Epoch-based timebase so timestamps are accurate across page reloads.
      captureStreams = startCaptureStreams(startedAtEpoch);

      const rec = useRecordingState();
      rec.setActive(true);
      rec.setState('recording');
      rec.setElapsed(Math.max(0, Date.now() - startedAtEpoch));
      rec.setBlurActive(false);

      // Live timer.
      recTick = setInterval(() => {
        if (rec.state.value === 'recording') {
          rec.setElapsed(Math.max(0, Date.now() - startedAtEpoch));
        }
      }, 200);

      recElementBlur = createElementBlur();

      // Launcher → content-script intents.
      recUnwatchers = [
        // Pause / resume.
        watch(() => rec.togglePauseRequested.value, async (v, prev) => {
          if (v === prev) return;
          const cmd = rec.state.value === 'recording' ? 'pause' : 'resume';
          await chrome.runtime.sendMessage({ type: 'RECORDING_COMMAND', command: cmd }).catch(() => null);
          rec.setState(cmd === 'pause' ? 'paused' : 'recording');
        }),
        // Stop.
        watch(() => rec.stopRequested.value, (v, prev) => {
          if (v === prev) return;
          chrome.runtime.sendMessage({ type: 'RECORDING_COMMAND', command: 'stop' }).catch(() => null);
        }),
        // Sticky element-blur toggle. ignoreEl = the launcher host so clicks on
        // the toolbar (to toggle blur off again) aren't swallowed by pick mode.
        watch(() => rec.blurRequested.value, (v, prev) => {
          if (v === prev || !recElementBlur) return;
          if (recElementBlur.isActive()) { recElementBlur.stop(); return; }
          const launcherHost = document.querySelector('dp-launcher');
          recElementBlur.start({
            ignoreEl:  launcherHost,
            onStopped: () => rec.setBlurActive(false),
          });
          rec.setBlurActive(true);
        }),
      ];

      syncLauncherVisibility();
    }

    /** Stop the timer + watchers + blur, and flip the launcher back to the FAB. */
    function tearDownRecordingControls() {
      if (recTick) { clearInterval(recTick); recTick = null; }
      recElementBlur?.restoreAll(); recElementBlur = null;
      recUnwatchers.forEach((u) => u()); recUnwatchers = [];
      useRecordingState().setActive(false);
    }

    // ── Resume banner (interrupted recording on a reloaded page) ──────────────
    // Shown after a tab reload/navigation broke the tabCapture stream. The
    // banner's Resume click is the user gesture chrome.tabCapture needs to
    // mint a new stream. Discard ends the recording without saving.
    async function mountResumeBanner(_startedAtEpoch: number) {
      resumeUi?.remove(); resumeUi = null;

      resumeUi = await createShadowRootUi(ctx, {
        name:     'dp-recording-resume',
        position: 'inline',
        anchor:   'body',
        onMount(container) {
          const host = (container.getRootNode() as ShadowRoot).host as HTMLElement;
          host.style.position      = 'fixed';
          host.style.inset         = '0';
          host.style.pointerEvents = 'none';
          host.style.zIndex        = '2147483646';
          initTheme(container);

          const app = createApp(RecordingResumeBanner, {
            onResume: async () => {
              const res = await chrome.runtime.sendMessage({ type: 'RESUME_RECORDING_FLOW' })
                .catch(() => null);
              if (!res?.ok) {
                console.warn('[DevProbe] resume failed:', res?.error);
                return;
              }
              // RECORDING_STARTED will come back from background and mount the
              // toolbar via the onMessage listener; tear down the banner here.
              resumeUi?.remove(); resumeUi = null;
              syncLauncherVisibility();
            },
            onDiscard: async () => {
              // Finalise the existing parked segments → review modal opens
              // on this page with whatever was captured before the reload.
              await chrome.runtime.sendMessage({ type: 'RECORDING_COMMAND', command: 'stop' })
                .catch(() => null);
              resumeUi?.remove(); resumeUi = null;
              syncLauncherVisibility();
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
      resumeUi.mount();
      syncLauncherVisibility();
    }

    // ── Handle recording finalised ────────────────────────────────────────────
    async function handleRecordingFinalised(msg: FinalisedMsg) {
      // Collect events captured on this page, then tear down toolbar/banner
      const { markers, events } = captureStreams?.stop() ?? { markers: [] as RecordingMarker[], events: [] as UploadedTimelineEvent[] };
      captureStreams = null;
      tearDownRecordingControls();        // flips the launcher back from toolbar → FAB
      resumeUi?.remove();     resumeUi     = null;
      // Don't re-show the FAB yet — the review modal is about to mount.
      // syncLauncherVisibility() runs in openRecordingModal + its onClose.

      if (!msg.segments?.length) {
        console.warn('[DevProbe] RECORDING_FINALISED with no segments');
        syncLauncherVisibility();
        return;
      }

      // Decode each segment → Blob, then make a single composite blob.
      // Each segment is a self-contained WebM (Chrome's `<video>` plays the
      // first reliably; full multi-segment playback uses the segment list
      // separately so the issue page can offer a "next clip" affordance).
      const segmentBlobs: Blob[] = msg.segments.map((s) => {
        const binary = atob(s.base64);
        const bytes  = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return new Blob([bytes], { type: s.mimeType });
      });
      const totalDurationMs = msg.segments.reduce((sum, s) => sum + s.durationMs, 0);
      const heroBlob = segmentBlobs[0]!;             // first segment as the hero video
      const heroUrl  = URL.createObjectURL(heroBlob);

      const { getAuth } = await import('../lib/auth.js');
      const auth = await getAuth();

      openRecordingModal(
        heroUrl,
        totalDurationMs,
        markers,
        events,
        collectBrowserMetaFromPage(),
        auth,
        {
          startedAt: new Date(msg.startedAtEpoch).toISOString(),
          stoppedAt: new Date(msg.stoppedAtEpoch).toISOString(),
        },
        segmentBlobs,    // full list so the submit pipeline can upload all parts
      );
    }

    // ── Recording review modal ────────────────────────────────────────────────
    async function openRecordingModal(
      videoBlobUrl: string,
      durationMs:   number,
      markers:      RecordingMarker[],
      events:       UploadedTimelineEvent[],
      browserMeta:  BrowserMeta,
      auth:         StoredAuth | null,
      session:      { startedAt: string; stoppedAt: string },
      /** Full segment list — the hero blob (first segment) is also at videoBlobUrl. */
      segmentBlobs: Blob[] = [],
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
            segmentBlobs,
            onClose: () => {
              URL.revokeObjectURL(videoBlobUrl);
              recordingUi?.remove();
              recordingUi = null;
              syncLauncherVisibility();
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
      syncLauncherVisibility();
    }

    // ── Browser meta (content-script side, no chrome.scripting access) ────────
    function collectBrowserMetaFromPage(): BrowserMeta {
      const ua = navigator.userAgent;
      return {
        userAgent:        ua,
        browser:          /Chrome/.test(ua) ? 'Chrome' : /Firefox/.test(ua) ? 'Firefox' : 'Unknown',
        browserVersion:   (ua.match(/(?:Chrome|Firefox|Safari)\/([\d.]+)/) ?? [, ''])[1] ?? '',
        os:               /Mac/.test(ua) ? 'macOS' : /Win/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : 'Unknown',
        osVersion:        '',
        deviceType:       'desktop',
        viewport:         { width: window.innerWidth, height: window.innerHeight },
        screenSize:       { width: window.screen.width, height: window.screen.height },
        devicePixelRatio: window.devicePixelRatio,
        timezone:         Intl.DateTimeFormat().resolvedOptions().timeZone,
        language:         navigator.language,
        colorScheme:      window.matchMedia('(prefers-color-scheme: dark)').matches  ? 'dark'
                        : window.matchMedia('(prefers-color-scheme: light)').matches ? 'light'
                        : 'no-preference',
        pageUrl:          location.href,
        pageTitle:        document.title,
        releaseVersion:   (document.querySelector('meta[name="release-version"]') as HTMLMetaElement | null)?.content ?? null,
        commitSha:        (document.querySelector('meta[name="commit-sha"]') as HTMLMetaElement | null)?.content ?? null,
        buildId:          (document.querySelector('meta[name="build-id"]') as HTMLMetaElement | null)?.content ?? null,
        featureFlags:     {},
        networkType:      null,
      };
    }
  },
});
