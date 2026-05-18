import { isExtensionAlive } from "./extension.js";

const TOKEN_KEY = "dp_token";
const ORG_KEY = "dp_org";
const USER_KEY = "dp_user";

export interface StoredAuth {
  token: string;
  orgId: string;
  userId?: string;
}

export async function getAuth(): Promise<StoredAuth | null> {
  if (!isExtensionAlive()) return null;
  try {
    const data = await chrome.storage.local.get([TOKEN_KEY, ORG_KEY, USER_KEY]);
    const token = data[TOKEN_KEY] as string | undefined;
    if (!token) return null;
    return {
      token,
      orgId: data[ORG_KEY] as string,
      userId: data[USER_KEY] as string | undefined,
    };
  } catch {
    return null;
  }
}

export async function setAuth(auth: StoredAuth): Promise<void> {
  if (!isExtensionAlive()) return;
  try {
    await chrome.storage.local.set({
      [TOKEN_KEY]: auth.token,
      [ORG_KEY]: auth.orgId,
      [USER_KEY]: auth.userId,
    });
  } catch { /* storage unavailable */ }
}

export async function clearAuth(): Promise<void> {
  if (!isExtensionAlive()) return;
  try {
    await chrome.storage.local.remove([TOKEN_KEY, ORG_KEY, USER_KEY]);
  } catch { /* storage unavailable */ }
}

// Subscribe to auth changes — fires whenever the token is added, updated, or cleared.
// Useful so the popup / launcher can flip between connected and disconnected UI live.
export function onAuthChange(cb: (auth: StoredAuth | null) => void): () => void {
  if (!isExtensionAlive()) return () => { /* no-op when storage is unavailable */ };
  function handler(changes: Record<string, chrome.storage.StorageChange>, area: string) {
    if (!isExtensionAlive()) return;
    if (area !== "local") return;
    if (!(TOKEN_KEY in changes) && !(ORG_KEY in changes) && !(USER_KEY in changes)) return;
    getAuth().then(cb).catch(() => { /* context died mid-read */ });
  }
  try {
    chrome.storage.onChanged.addListener(handler);
    return () => {
      try { chrome.storage.onChanged.removeListener(handler); } catch { /* ignore */ }
    };
  } catch {
    return () => { /* no-op when storage is unavailable */ };
  }
}
