import { defineConfig } from 'wxt';
import { resolve } from 'path';

export default defineConfig({
  vite: () => ({
    resolve: {
      alias: {
        '@ui': resolve(__dirname, '../../packages/ui/src'),
      },
    },
  }),
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-vue'],
  srcDir: 'src',
  manifest: {
    name: 'DevProbe',
    description: 'Capture complete, developer-ready bug reports in seconds.',
    version: '0.0.1',
    permissions: [
      'tabs',
      'activeTab',
      'storage',
      'scripting',
      'debugger',
      // Needed so the background SW can mint a tab MediaStream ID without
      // triggering Chrome's screen-picker UI (chrome.tabCapture.getMediaStreamId).
      'tabCapture',
      // Owns the MediaRecorder so it survives the captured tab's reloads
      // and navigation — the page's JS context dies on reload, an offscreen
      // document does not.
      'offscreen',
    ],
    host_permissions: ['<all_urls>'],
    action: {
      default_title: 'DevProbe — capture a bug',
    },
    externally_connectable: {
      matches: [
        'http://localhost:5173/*',
        'http://localhost:4173/*',
        'https://*.deveprobe.com/*',
      ],
    },
    web_accessible_resources: [
      {
        resources: ['icon/*.png'],
        matches: ['<all_urls>'],
      },
    ],
  },
});
