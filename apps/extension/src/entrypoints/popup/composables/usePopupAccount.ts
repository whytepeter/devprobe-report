import { ref, onMounted, onUnmounted } from 'vue';
import { api, type Me } from '../../../lib/api.js';
import { getAuth, clearAuth, onAuthChange, type StoredAuth } from '../../../lib/auth.js';

const ME_CACHE_KEY = 'dp:me-cache';

/**
 * Popup account state.
 *
 * The popup is opened many times a day, so we optimise for instant render:
 *   1. Read `auth` from chrome.storage synchronously-ish (a single IPC, fast).
 *      `initialised` flips true after this resolves so the template can show
 *      ActionList / ConnectPrompt without flickering through the wrong state.
 *   2. Kick off `api.me()` in the background WITHOUT awaiting — the popup is
 *      already on screen. AccountMenu fills in once /auth/me returns.
 *   3. Stash the response in chrome.storage so the NEXT open paints the
 *      header avatar from cache before the network roundtrip lands.
 */
export function usePopupAccount() {
  const auth        = ref<StoredAuth | null>(null);
  const me          = ref<Me | null>(null);
  const initialised = ref(false);
  const loading     = ref(false);
  const error       = ref('');

  let unsubscribe: (() => void) | null = null;

  /** Synchronously load the cached `me` so the avatar is instant. */
  async function loadCachedMe(): Promise<Me | null> {
    try {
      const r = await chrome.storage.local.get(ME_CACHE_KEY);
      return (r[ME_CACHE_KEY] as Me) ?? null;
    } catch {
      return null;
    }
  }

  /** Fire-and-forget refresh of /auth/me. Caches into chrome.storage on success. */
  function refreshMeInBackground() {
    if (!auth.value?.token) return;
    api.me()
      .then((next) => {
        me.value = next;
        chrome.storage.local.set({ [ME_CACHE_KEY]: next }).catch(() => { /* ignore */ });
      })
      .catch(() => { /* swallow — leave the cached value in place */ });
  }

  async function disconnect() {
    await clearAuth();
    auth.value = null;
    me.value   = null;
    chrome.storage.local.remove(ME_CACHE_KEY).catch(() => { /* ignore */ });
  }

  onMounted(async () => {
    loading.value = true;
    try {
      // Fast path: auth + cached me (both chrome.storage). Renders immediately.
      const [storedAuth, cachedMe] = await Promise.all([getAuth(), loadCachedMe()]);
      auth.value        = storedAuth;
      me.value          = cachedMe;
      initialised.value = true;
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      loading.value = false;
    }

    // Slow path: refresh from the API in the background. The popup is already
    // visible; AccountMenu updates when /auth/me returns.
    refreshMeInBackground();

    unsubscribe = onAuthChange(async (next) => {
      auth.value = next;
      if (!next) {
        me.value = null;
        chrome.storage.local.remove(ME_CACHE_KEY).catch(() => { /* ignore */ });
      } else {
        refreshMeInBackground();
      }
    });
  });

  onUnmounted(() => { unsubscribe?.(); });

  return {
    auth,
    me,
    initialised,
    loading,
    error,
    refresh:    refreshMeInBackground,
    disconnect,
  };
}
