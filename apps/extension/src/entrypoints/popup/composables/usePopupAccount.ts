import { ref, onMounted, onUnmounted } from 'vue';
import { api, type Me } from '../../../lib/api.js';
import { getAuth, clearAuth, onAuthChange, type StoredAuth } from '../../../lib/auth.js';

/**
 * Popup account state — keeps the workspace identity in sync with chrome.storage
 * so several popup views can read the same values. Folder selection is a
 * dashboard concern; the extension only knows about the workspace.
 */
export function usePopupAccount() {
  const auth = ref<StoredAuth | null>(null);
  const me = ref<Me | null>(null);
  const loading = ref(false);
  const error = ref('');

  let unsubscribe: (() => void) | null = null;

  async function refresh() {
    loading.value = true;
    error.value = '';
    try {
      auth.value = await getAuth();
      if (!auth.value?.token) {
        me.value = null;
        return;
      }
      me.value = await api.me().catch(() => null);
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      loading.value = false;
    }
  }

  async function disconnect() {
    await clearAuth();
    auth.value = null;
    me.value = null;
  }

  onMounted(async () => {
    await refresh();
    unsubscribe = onAuthChange(async (next) => {
      auth.value = next;
      if (!next) me.value = null;
    });
  });

  onUnmounted(() => { unsubscribe?.(); });

  return {
    auth,
    me,
    loading,
    error,
    refresh,
    disconnect,
  };
}
