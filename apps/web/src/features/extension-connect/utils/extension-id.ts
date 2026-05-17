/**
 * Chrome extension ids are 32 lowercase letters [a-p], but we accept any
 * lowercase a-z for forward compatibility / dev-built ids.
 */
export const EXT_ID_RE = /^[a-z]{32}$/;

export function isValidExtId(id: string): boolean {
  return EXT_ID_RE.test(id);
}

const STORAGE_KEY = "dp_extension_id";

export function readStoredExtId(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function persistExtId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch { /* private mode */ }
}
