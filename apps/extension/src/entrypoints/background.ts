import { setAuth, getAuth } from "../lib/auth.js";
import { API_URL } from "../lib/env.js";

/**
 * API proxy
 * ─────────
 * Content scripts inherit the host page's origin, so direct fetches to the
 * Worker get rejected by CORS unless every customer domain is allowlisted
 * server-side (not feasible). Background service workers use the
 * `chrome-extension://` origin which the Worker already allows, so we proxy
 * every API call through here.
 *
 * Files map to the multipart "file" field. Blobs cross the message boundary
 * fine in Chrome — they're structured-cloneable in MV3.
 */
interface ApiFetchMessage {
  type: "API_FETCH";
  path: string;
  method?: string;
  json?: unknown;                                  // JSON body, mutually exclusive with file
  // File payloads cross the message boundary as base64. Blob/File/ArrayBuffer
  // all arrive as `{}` in MV3 SW; only JSON-safe transport survives.
  file?: { base64: string; contentType: string; filename: string };
  fields?: Record<string, string>;                 // extra multipart fields
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function handleApiFetch(msg: ApiFetchMessage): Promise<{ ok: true; data: unknown } | { ok: false; status?: number; error: string }> {
  const auth = await getAuth();
  const headers = new Headers();
  if (auth?.token) headers.set("Authorization", `Bearer ${auth.token}`);

  let body: BodyInit | undefined;
  if (msg.file) {
    const bytes = base64ToBytes(msg.file.base64);
    const blob = new Blob([bytes], { type: msg.file.contentType });
    const form = new FormData();
    form.append("file", blob, msg.file.filename);
    for (const [k, v] of Object.entries(msg.fields ?? {})) form.append(k, v);
    body = form;
  } else if (msg.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(msg.json);
  }

  try {
    const res = await fetch(`${API_URL}${msg.path}`, {
      method: msg.method ?? (body ? "POST" : "GET"),
      headers,
      body,
    });
    const text = await res.text();
    let json: { ok?: boolean; data?: unknown; error?: { message?: string } };
    try { json = text ? JSON.parse(text) : {}; } catch { json = {}; }
    if (!res.ok || json.ok === false) {
      return { ok: false, status: res.status, error: json.error?.message ?? `Request failed: ${res.status}` };
    }
    return { ok: true, data: json.data };
  } catch (e) {
    return { ok: false, error: (e as Error).message || "Network error" };
  }
}

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(() => {
    console.log("[DevProbe] extension installed");
  });

  // Internal popup ↔ background ↔ content messaging
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    (async () => {
      try {
        switch (msg?.type) {
          case "PING":
            sendResponse({ type: "PONG" });
            return;

          case "OPEN_TAB": {
            if (!msg.url) { sendResponse({ ok: false, error: "Missing url" }); return; }
            await chrome.tabs.create({ url: msg.url });
            sendResponse({ ok: true });
            return;
          }

          case "API_FETCH": {
            const result = await handleApiFetch(msg as ApiFetchMessage);
            sendResponse(result);
            return;
          }

          case "CAPTURE_VISIBLE_TAB": {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab?.windowId) {
              sendResponse({ ok: false, error: "No active tab" });
              return;
            }
            const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
            sendResponse({ ok: true, dataUrl, tab });
            return;
          }

          // Popup → background → content: ensures content script is injected before forwarding
          case "FORWARD_TO_CONTENT": {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab?.id) { sendResponse({ ok: false, error: "No active tab" }); return; }

            // Ping first; inject if not running
            const alive = await chrome.tabs.sendMessage(tab.id, { type: "PING" })
              .then(() => true)
              .catch(() => false);

            if (!alive) {
              await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ["/content-scripts/content.js"],
              }).catch(() => null);
              // Brief wait for the script to initialise its listeners
              await new Promise(r => setTimeout(r, 300));
            }

            await chrome.tabs.sendMessage(tab.id, msg.payload).catch(() => null);
            sendResponse({ ok: true });
            return;
          }

          case "OPEN_LAUNCHER": {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab?.id) {
              await chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_LAUNCHER" }).catch(() => null);
            }
            sendResponse({ ok: true });
            return;
          }

          default:
            sendResponse({ ok: false, error: `Unknown message: ${msg?.type}` });
        }
      } catch (e) {
        sendResponse({ ok: false, error: (e as Error).message });
      }
    })();
    return true;
  });

  // External handshake from web app (allowed origins set via externally_connectable)
  chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {
    (async () => {
      if (msg?.type !== "DEVPROBE_AUTH_HANDOFF") {
        sendResponse({ ok: false, error: "Unknown handoff" });
        return;
      }
      if (!msg.token || !msg.orgId) {
        sendResponse({ ok: false, error: "Missing token/orgId" });
        return;
      }
      await setAuth({
        token: msg.token,
        orgId: msg.orgId,
        userId: msg.userId,
      });
      console.log("[DevProbe] auth received from", sender.origin);
      sendResponse({ ok: true });
    })();
    return true;
  });
});
