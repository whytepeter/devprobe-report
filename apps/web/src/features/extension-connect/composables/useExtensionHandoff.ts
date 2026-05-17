import { ref } from "vue";
import { persistExtId, isValidExtId } from "@/features/extension-connect/utils/extension-id.js";

type ChromeRuntime = {
  sendMessage?: (id: string, msg: unknown, cb: (resp: unknown) => void) => void;
};

export interface HandoffPayload {
  token: string;
  orgId: string;
  userId: string | null;
}

/**
 * Wraps chrome.runtime.sendMessage to perform the DEVPROBE_AUTH_HANDOFF.
 * Lives in its own composable so the page is purely presentational.
 */
export function useExtensionHandoff() {
  const sending = ref(false);
  const error = ref("");

  async function connect(extId: string, payload: HandoffPayload): Promise<boolean> {
    if (!isValidExtId(extId)) {
      error.value = "That doesn't look like a valid extension id.";
      return false;
    }
    if (!payload.token) {
      error.value = "Sign in first — no auth token to hand off.";
      return false;
    }

    sending.value = true;
    error.value = "";
    try {
      persistExtId(extId);
      const runtime = (window as unknown as { chrome?: { runtime?: ChromeRuntime } }).chrome?.runtime;
      if (!runtime?.sendMessage) {
        throw new Error("Chrome extension runtime not available in this browser.");
      }
      await new Promise<void>((resolve, reject) => {
        runtime.sendMessage!(
          extId,
          {
            type: "DEVPROBE_AUTH_HANDOFF",
            token: payload.token,
            orgId: payload.orgId,
            userId: payload.userId,
          },
          (resp: unknown) => {
            const r = resp as { ok?: boolean; error?: string } | undefined;
            if (!r) return reject(new Error("No response from extension. Is it installed and the id correct?"));
            if (!r.ok) return reject(new Error(r.error ?? "Extension rejected handoff."));
            resolve();
          },
        );
      });
      return true;
    } catch (e) {
      error.value = (e as Error).message;
      return false;
    } finally {
      sending.value = false;
    }
  }

  return { sending, error, connect };
}
