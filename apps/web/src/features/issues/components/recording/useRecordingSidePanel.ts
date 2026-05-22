/**
 * useRecordingSidePanel
 * ─────────────────────
 * Toggle + active-tab state for the recording-mode side panel. Lives in a
 * composable (not a Pinia store) because the state is scoped to a single
 * issue page — navigating between issues resets it naturally.
 */
import { ref } from 'vue';

export type RecordingTab = 'info' | 'console' | 'network' | 'actions';

const DEFAULT_TAB: RecordingTab = 'console';

export function useRecordingSidePanel(initialOpen = true) {
  const open      = ref(initialOpen);
  const activeTab = ref<RecordingTab>(DEFAULT_TAB);

  function toggle()        { open.value = !open.value; }
  function close()         { open.value = false; }
  function show()          { open.value = true; }
  function setTab(t: RecordingTab) { activeTab.value = t; open.value = true; }

  return { open, activeTab, toggle, close, show, setTab };
}
