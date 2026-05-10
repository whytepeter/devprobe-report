import { isExtensionAlive } from "./extension.js";

const TOKEN_KEY = "dp_token";
const ORG_KEY = "dp_org";
const PROJECT_KEY = "dp_default_project";

export interface StoredAuth {
  token: string;
  orgId: string;
  userId?: string;
  defaultProjectId?: string;
}

export async function getAuth(): Promise<StoredAuth | null> {
  if (!isExtensionAlive()) return null;
  try {
    const data = await chrome.storage.local.get([TOKEN_KEY, ORG_KEY, PROJECT_KEY, "dp_user"]);
    const token = data[TOKEN_KEY] as string | undefined;
    if (!token) return null;
    return {
      token,
      orgId: data[ORG_KEY] as string,
      userId: data["dp_user"] as string | undefined,
      defaultProjectId: data[PROJECT_KEY] as string | undefined,
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
      dp_user: auth.userId,
      [PROJECT_KEY]: auth.defaultProjectId,
    });
  } catch { /* storage unavailable */ }
}

export async function setDefaultProject(projectId: string): Promise<void> {
  if (!isExtensionAlive()) return;
  try {
    await chrome.storage.local.set({ [PROJECT_KEY]: projectId });
  } catch { /* storage unavailable */ }
}

export async function clearAuth(): Promise<void> {
  if (!isExtensionAlive()) return;
  try {
    await chrome.storage.local.remove([TOKEN_KEY, ORG_KEY, PROJECT_KEY, "dp_user"]);
  } catch { /* storage unavailable */ }
}

// Subscribe to auth changes — fires whenever the token is added, updated, or cleared.
// Useful so the popup / launcher can flip between connected and disconnected UI live.
export function onAuthChange(cb: (auth: StoredAuth | null) => void): () => void {
  if (!isExtensionAlive()) return () => { /* no-op when storage is unavailable */ };
  function handler(changes: Record<string, chrome.storage.StorageChange>, area: string) {
    if (!isExtensionAlive()) return;
    if (area !== "local") return;
    if (!(TOKEN_KEY in changes) && !(ORG_KEY in changes) && !(PROJECT_KEY in changes) && !("dp_user" in changes)) return;
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
