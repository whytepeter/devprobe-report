import { setAuth } from "../lib/auth.js";

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
        defaultProjectId: msg.defaultProjectId,
      });
      console.log("[DevProbe] auth received from", sender.origin);
      sendResponse({ ok: true });
    })();
    return true;
  });
});
