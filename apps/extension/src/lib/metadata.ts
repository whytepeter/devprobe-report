import type { BrowserMeta } from "@deveprobe/shared";

interface PageProbe {
  viewport: { width: number; height: number };
  screenSize: { width: number; height: number };
  devicePixelRatio: number;
  userAgent: string;
  platform: string;
  language: string;
  timezone: string;
  colorScheme: "light" | "dark" | "no-preference";
  referrer?: string;
  docTitle: string;
  releaseVersion: string | null;
  commitSha: string | null;
  buildId: string | null;
}

function parseUserAgent(ua: string): {
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  deviceType: "desktop" | "tablet" | "mobile";
} {
  const browser = /Edg\/([\d.]+)/.exec(ua)
    ? { name: "Edge", version: /Edg\/([\d.]+)/.exec(ua)![1]! }
    : /Chrome\/([\d.]+)/.exec(ua)
    ? { name: "Chrome", version: /Chrome\/([\d.]+)/.exec(ua)![1]! }
    : /Firefox\/([\d.]+)/.exec(ua)
    ? { name: "Firefox", version: /Firefox\/([\d.]+)/.exec(ua)![1]! }
    : /Safari\/([\d.]+)/.exec(ua)
    ? { name: "Safari", version: /Version\/([\d.]+)/.exec(ua)?.[1] ?? "" }
    : { name: "Unknown", version: "" };

  const os = /Windows NT ([\d.]+)/.exec(ua)
    ? { name: "Windows", version: /Windows NT ([\d.]+)/.exec(ua)![1]! }
    : /Mac OS X ([\d_.]+)/.exec(ua)
    ? { name: "macOS", version: /Mac OS X ([\d_.]+)/.exec(ua)![1]!.replace(/_/g, ".") }
    : /Android ([\d.]+)/.exec(ua)
    ? { name: "Android", version: /Android ([\d.]+)/.exec(ua)![1]! }
    : /iPhone OS ([\d_]+)/.exec(ua)
    ? { name: "iOS", version: /iPhone OS ([\d_]+)/.exec(ua)![1]!.replace(/_/g, ".") }
    : /Linux/.test(ua)
    ? { name: "Linux", version: "" }
    : { name: "Unknown", version: "" };

  const deviceType: "desktop" | "tablet" | "mobile" = /Mobi|Android.*Mobile|iPhone/.test(ua)
    ? "mobile"
    : /iPad|Tablet/.test(ua)
    ? "tablet"
    : "desktop";

  return {
    browser: browser.name,
    browserVersion: browser.version,
    os: os.name,
    osVersion: os.version,
    deviceType,
  };
}

export async function collectBrowserMeta(tab: chrome.tabs.Tab): Promise<BrowserMeta> {
  const tabId = tab.id;
  const url = tab.url ?? "";
  const title = tab.title ?? "";

  let probe: Partial<PageProbe> = {};
  if (tabId !== undefined) {
    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => ({
          viewport: { width: window.innerWidth, height: window.innerHeight },
          screenSize: { width: window.screen.width, height: window.screen.height },
          devicePixelRatio: window.devicePixelRatio,
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          colorScheme: window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : window.matchMedia("(prefers-color-scheme: light)").matches
            ? "light"
            : "no-preference",
          referrer: document.referrer || undefined,
          docTitle: document.title,
          releaseVersion:
            (document.querySelector('meta[name="release-version"]') as HTMLMetaElement | null)?.content ?? null,
          commitSha:
            (document.querySelector('meta[name="commit-sha"]') as HTMLMetaElement | null)?.content ?? null,
          buildId:
            (document.querySelector('meta[name="build-id"]') as HTMLMetaElement | null)?.content ?? null,
        }),
      });
      probe = (result?.result ?? {}) as Partial<PageProbe>;
    } catch {
      // restricted page (chrome://, extension, etc.)
    }
  }

  const ua = probe.userAgent ?? navigator.userAgent;
  const parsed = parseUserAgent(ua);

  return {
    userAgent: ua,
    browser: parsed.browser,
    browserVersion: parsed.browserVersion,
    os: parsed.os,
    osVersion: parsed.osVersion,
    deviceType: parsed.deviceType,
    viewport: probe.viewport ?? { width: 0, height: 0 },
    screenSize: probe.screenSize ?? { width: 0, height: 0 },
    devicePixelRatio: probe.devicePixelRatio ?? 1,
    timezone: probe.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: probe.language ?? navigator.language,
    colorScheme: probe.colorScheme ?? "no-preference",
    pageUrl: url,
    pageTitle: probe.docTitle ?? title,
    releaseVersion: probe.releaseVersion ?? null,
    commitSha: probe.commitSha ?? null,
    buildId: probe.buildId ?? null,
    featureFlags: {},
    networkType: null,
  };
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(",");
  const match = /data:([^;]+);base64/.exec(meta ?? "");
  const mime = match?.[1] ?? "image/png";
  const bin = atob(b64 ?? "");
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
