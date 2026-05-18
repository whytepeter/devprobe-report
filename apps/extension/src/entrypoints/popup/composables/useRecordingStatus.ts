/**
 * Tracks the global active-recording state surfaced by the content script.
 *
 * The content script writes `dp:recording` to chrome.storage.local when a
 * recording starts and removes it when it ends. The popup uses this signal
 * to swap into a "Recording in progress" view with a Stop button.
 */
import { ref, onMounted, onUnmounted } from 'vue';

const KEY = 'dp:recording';

export interface RecordingState {
  startedAt: number;
  pageUrl:   string;
}

export function useRecordingStatus() {
  const state     = ref<RecordingState | null>(null);
  const elapsedMs = ref(0);

  let tick: ReturnType<typeof setInterval> | null = null;

  function applyState(value: RecordingState | null) {
    state.value = value;
    elapsedMs.value = value ? Math.max(0, Date.now() - value.startedAt) : 0;
  }

  function onStorage(changes: Record<string, chrome.storage.StorageChange>, area: string) {
    if (area !== 'local' || !changes[KEY]) return;
    applyState((changes[KEY].newValue as RecordingState | undefined) ?? null);
  }

  onMounted(async () => {
    try {
      const res = await chrome.storage.local.get(KEY);
      applyState((res[KEY] as RecordingState | undefined) ?? null);
    } catch { /* storage unavailable */ }

    try { chrome.storage.onChanged.addListener(onStorage); } catch { /* ignore */ }

    tick = setInterval(() => {
      if (state.value) elapsedMs.value = Date.now() - state.value.startedAt;
    }, 500);
  });

  onUnmounted(() => {
    if (tick) clearInterval(tick);
    try { chrome.storage.onChanged.removeListener(onStorage); } catch { /* ignore */ }
  });

  return { state, elapsedMs };
}
