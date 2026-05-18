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

// ── Offscreen recording host ──────────────────────────────────────────────────
//
// The MediaRecorder used for screen recording lives in a hidden offscreen
// document so that reloading or navigating the captured tab DOESN'T kill the
// recording. Background = lifecycle + message hub between popup / content
// scripts / offscreen.
//
// chrome.storage keys:
//   dp:recording = { tabId, pageUrl, startedAtEpoch }  → set while active
//
const OFFSCREEN_URL = "/offscreen.html";

async function hasOffscreenDocument(): Promise<boolean> {
  // getContexts is the supported way on MV3.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contexts = await (chrome.runtime as any).getContexts?.({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
  });
  return !!(contexts && contexts.length);
}

async function ensureOffscreenDocument(): Promise<void> {
  if (await hasOffscreenDocument()) return;
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_URL,
    // DISPLAY_MEDIA covers tab capture via getUserMedia(chromeMediaSource:'tab').
    reasons: ["USER_MEDIA" as chrome.offscreen.Reason],
    justification: "Owns the MediaRecorder across captured-tab reloads.",
  });
}

async function closeOffscreenDocument(): Promise<void> {
  if (!(await hasOffscreenDocument())) return;
  await chrome.offscreen.closeDocument().catch(() => { /* already closed */ });
}

interface RecordingState {
  tabId:          number;
  pageUrl:        string;
  startedAtEpoch: number;
}

async function setRecordingState(state: RecordingState | null) {
  if (state) await chrome.storage.local.set({ "dp:recording": state });
  else       await chrome.storage.local.remove("dp:recording");
}

async function getRecordingState(): Promise<RecordingState | null> {
  const r = await chrome.storage.local.get("dp:recording");
  return (r["dp:recording"] as RecordingState | undefined) ?? null;
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

          // Mint a tab MediaStream ID the content script can hand to
          // navigator.mediaDevices.getUserMedia({ video: { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId } } }).
          // This skips Chrome's screen-picker entirely — recording starts on
          // the active tab the moment the user clicks Record.
          //
          // tabCapture.getMediaStreamId requires a user gesture in the
          // EXTENSION context (popup click counts). The popup path forwards
          // this message via FORWARD_TO_CONTENT → background → tabCapture.
          case "GET_TAB_STREAM_ID": {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab?.id) { sendResponse({ ok: false, error: "No active tab" }); return; }
            try {
              const streamId = await new Promise<string>((resolve, reject) => {
                chrome.tabCapture.getMediaStreamId(
                  { consumerTabId: tab.id },
                  (id) => {
                    const err = chrome.runtime.lastError;
                    if (err || !id) reject(new Error(err?.message || "No stream id"));
                    else resolve(id);
                  },
                );
              });
              sendResponse({ ok: true, streamId });
            } catch (e) {
              sendResponse({ ok: false, error: (e as Error).message });
            }
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

          // ── Recording flow ────────────────────────────────────────────────
          // Popup or FAB triggers this. Mints a tabCapture stream id, spawns
          // the offscreen document (if not already up), and tells it to start.
          case "START_RECORDING_FLOW": {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab?.id) { sendResponse({ ok: false, error: "No active tab" }); return; }

            try {
              const streamId = await new Promise<string>((resolve, reject) => {
                chrome.tabCapture.getMediaStreamId(
                  // No consumerTabId → the offscreen document can consume the stream.
                  { targetTabId: tab.id },
                  (id) => {
                    const err = chrome.runtime.lastError;
                    if (err || !id) reject(new Error(err?.message || "No stream id"));
                    else resolve(id);
                  },
                );
              });

              await ensureOffscreenDocument();

              const startedAtEpoch = Date.now();
              await chrome.runtime.sendMessage({
                type: "START_OFFSCREEN",
                streamId,
                startedAtEpoch,
              });

              await setRecordingState({
                tabId:   tab.id,
                pageUrl: tab.url ?? "",
                startedAtEpoch,
              });

              // Tell the active tab's content script to mount the floating toolbar.
              await chrome.tabs.sendMessage(tab.id, { type: "RECORDING_STARTED", startedAtEpoch })
                .catch(() => { /* content script not yet up — it'll mount on init */ });

              sendResponse({ ok: true });
            } catch (e) {
              sendResponse({ ok: false, error: (e as Error).message });
            }
            return;
          }

          // Toolbar / popup → background → offscreen.
          // Commands: pause | resume | stop
          case "RECORDING_COMMAND": {
            const cmd = msg.command as "pause" | "resume" | "stop";
            const offscreenMsg =
              cmd === "pause"  ? "PAUSE_OFFSCREEN"  :
              cmd === "resume" ? "RESUME_OFFSCREEN" :
                                 "STOP_OFFSCREEN";
            await chrome.runtime.sendMessage({ type: offscreenMsg }).catch(() => null);
            sendResponse({ ok: true });
            return;
          }

          // Returns the persisted recording state so content scripts can
          // decide whether to mount the toolbar on init.
          case "GET_RECORDING_STATE": {
            const state = await getRecordingState();
            sendResponse({ ok: true, state });
            return;
          }

          // From offscreen: recording finished, send blob to the original tab
          // for review-modal mounting.
          case "OFFSCREEN_BLOB": {
            const state = await getRecordingState();
            await setRecordingState(null);
            await closeOffscreenDocument();
            if (state?.tabId) {
              await chrome.tabs.sendMessage(state.tabId, {
                type:           "RECORDING_FINALISED",
                base64:         msg.base64,
                mimeType:       msg.mimeType,
                durationMs:     msg.durationMs,
                startedAtEpoch: msg.startedAtEpoch,
                stoppedAtEpoch: msg.stoppedAtEpoch,
                pageUrl:        state.pageUrl,
              }).catch(() => { /* tab may be closed; user can recover via draft */ });
            }
            sendResponse({ ok: true });
            return;
          }

          case "OFFSCREEN_ERROR": {
            console.warn("[DevProbe] offscreen error:", msg.message);
            await setRecordingState(null);
            await closeOffscreenDocument();
            sendResponse({ ok: true });
            return;
          }

          case "OFFSCREEN_READY":
            // Diagnostic ping; nothing to do.
            sendResponse({ ok: true });
            return;

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
