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
import { createApp } from 'vue';
import FloatingLauncher  from '../components/launcher/FloatingLauncher.vue';
import RegionSelector    from '../components/capture/RegionSelector.vue';
import ScreenshotCapture from '../components/capture/screenshot/ScreenshotCapture.vue';
import { getTheme, applyThemeClass, onThemeChange } from '../lib/theme.js';
import type { BrowserMeta } from '@deveprobe/shared';
import type { StoredAuth }  from '../lib/auth.js';
import type { RegionBounds } from '../components/capture/RegionSelector.vue';

export default defineContentScript({
  matches:          ['<all_urls>'],
  runAt:            'document_idle',
  cssInjectionMode: 'ui',

  async main(ctx) {
    let regionUi:  Awaited<ReturnType<typeof createShadowRootUi>> | null = null;
    let captureUi: Awaited<ReturnType<typeof createShadowRootUi>> | null = null;

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
  },
});
