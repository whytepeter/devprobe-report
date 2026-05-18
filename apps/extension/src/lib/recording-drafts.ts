/**
 * Recording drafts — local persistence for in-flight recording uploads.
 *
 * Per SCREEN_RECORDING_SPEC.md ("Preserve local draft until server confirms
 * success"), we copy the recording Blob into IndexedDB the moment the user
 * hits submit, BEFORE attempting upload. The draft is deleted only after
 * the server confirms the attachment finalised.
 *
 * IndexedDB (not chrome.storage) because the SW message limit and storage
 * quota constraints don't fit multi-megabyte Blobs.
 *
 * Each draft is keyed by an `id` (generated client-side at submit time).
 * Stored fields are JSON-serialisable enough to survive a tab refresh and
 * provide the failure-recovery surface area:
 *  - the Blob (the actual recording)
 *  - form snapshot (title, summary, severity, visibility, tags)
 *  - durationMs, mimeType, createdAt
 *  - lastError (set when an upload attempt fails)
 *  - retryCount (incremented per attempt)
 */

const DB_NAME      = 'devprobe';
const DB_VERSION   = 1;
const STORE        = 'recording-drafts';

export interface RecordingDraft {
  id:         string;
  createdAt:  number;
  blob:       Blob;
  mimeType:   string;
  durationMs: number;
  filename:   string;
  form:       {
    title:      string;
    summary:    string;
    severity:   string;
    visibility: string;
    tags:       string[];
  };
  pageUrl?:   string;
  retryCount: number;
  lastError?: string;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | void> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const trans = db.transaction(STORE, mode);
    const store = trans.objectStore(STORE);
    const req   = run(store);
    if (req) {
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    } else {
      trans.oncomplete = () => resolve(undefined);
      trans.onerror    = () => reject(trans.error);
    }
  });
}

export function newDraftId(): string {
  return `rec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function saveDraft(draft: RecordingDraft): Promise<void> {
  await tx('readwrite', (s) => s.put(draft));
}

export async function loadDraft(id: string): Promise<RecordingDraft | undefined> {
  return (await tx<RecordingDraft>('readonly', (s) => s.get(id))) ?? undefined;
}

export async function listDrafts(): Promise<RecordingDraft[]> {
  return (await tx<RecordingDraft[]>('readonly', (s) => s.getAll())) ?? [];
}

export async function deleteDraft(id: string): Promise<void> {
  await tx('readwrite', (s) => s.delete(id));
}

export async function markDraftError(id: string, error: string): Promise<void> {
  const existing = await loadDraft(id);
  if (!existing) return;
  existing.lastError  = error;
  existing.retryCount = (existing.retryCount ?? 0) + 1;
  await saveDraft(existing);
}
