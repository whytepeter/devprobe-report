import { ref, computed, onMounted, onUnmounted } from 'vue';
import { api, type Me } from '../../../lib/api.js';
import {
  getAuth,
  setDefaultProject,
  clearAuth,
  onAuthChange,
  type StoredAuth,
} from '../../../lib/auth.js';
import type { Project } from '@deveprobe/shared';

/**
 * Popup account state — keeps the workspace identity, project list, and
 * "active" project (= the one new issues default to) in sync with
 * chrome.storage so several popup views can read the same values.
 */
export function usePopupAccount() {
  const auth = ref<StoredAuth | null>(null);
  const me = ref<Me | null>(null);
  const projects = ref<Project[]>([]);
  const loading = ref(false);
  const error = ref('');

  const activeProjectId = computed(() => auth.value?.defaultProjectId ?? null);
  const activeProject = computed(
    () => projects.value.find((p) => p.id === activeProjectId.value) ?? projects.value[0] ?? null,
  );

  let unsubscribe: (() => void) | null = null;

  async function refresh() {
    loading.value = true;
    error.value = '';
    try {
      auth.value = await getAuth();
      if (!auth.value?.token) {
        me.value = null;
        projects.value = [];
        return;
      }
      const [profile, list] = await Promise.all([
        api.me().catch(() => null),
        api.listProjects().catch(() => [] as Project[]),
      ]);
      me.value = profile;
      projects.value = list;
      // If no default project is set yet, adopt the first one so the
      // compose form always has something selected.
      if (!auth.value.defaultProjectId && list[0]) {
        await setDefaultProject(list[0].id);
      }
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      loading.value = false;
    }
  }

  async function selectProject(projectId: string) {
    await setDefaultProject(projectId);
    auth.value = await getAuth();
  }

  async function disconnect() {
    await clearAuth();
    auth.value = null;
    me.value = null;
    projects.value = [];
  }

  onMounted(async () => {
    await refresh();
    unsubscribe = onAuthChange(async (next) => {
      auth.value = next;
      if (!next) {
        me.value = null;
        projects.value = [];
      }
    });
  });

  onUnmounted(() => { unsubscribe?.(); });

  return {
    auth,
    me,
    projects,
    loading,
    error,
    activeProjectId,
    activeProject,
    refresh,
    selectProject,
    disconnect,
  };
}
