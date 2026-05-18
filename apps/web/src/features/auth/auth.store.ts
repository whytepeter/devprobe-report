import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { api } from "@/shared/lib/api.js";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: string;
  current?: boolean;
}

/**
 * Auth store
 * ──────────
 * Holds session token, user identity, and the currently active workspace.
 *
 * Persistence: serialised to localStorage via pinia-plugin-persistedstate.
 * Hydration:  on app start `hydrate()` runs once; if a token is present it
 *             validates it via GET /auth/me and clears state on failure.
 */
export const useAuthStore = defineStore(
  "auth",
  () => {
    const token = ref<string | null>(null);
    const userId = ref<string | null>(null);
    const orgId = ref<string | null>(null);
    const userName = ref<string | null>(null);
    const userEmail = ref<string | null>(null);
    const userRole = ref<string | null>(null);
    const workspaces = ref<Workspace[]>([]);
    const hydrated = ref(false);

    const isAuthenticated = computed(() => !!token.value);
    const currentWorkspace = computed<Workspace | null>(() => {
      return workspaces.value.find((w) => w.id === orgId.value) ?? null;
    });

    function setSession(t: string, uid: string, oid: string) {
      token.value = t;
      userId.value = uid;
      orgId.value = oid;
    }

    function clearSession() {
      token.value = null;
      userId.value = null;
      orgId.value = null;
      userName.value = null;
      userEmail.value = null;
      userRole.value = null;
      workspaces.value = [];
    }

    async function fetchMe() {
      if (!token.value) return;
      try {
        const res = await api.get("/auth/me");
        userName.value = res.data.data.name;
        userEmail.value = res.data.data.email;
        userRole.value = res.data.data.role;
      } catch {
        clearSession();
      }
    }

    async function fetchWorkspaces() {
      if (!token.value) return;
      try {
        const res = await api.get("/auth/workspaces");
        workspaces.value = res.data.data as Workspace[];
      } catch {
        workspaces.value = [];
      }
    }

    async function login(email: string, password: string) {
      const res = await api.post("/auth/login", { email, password });
      const { token: t, userId: uid, orgId: oid } = res.data.data;
      setSession(t, uid, oid);
      await Promise.all([fetchMe(), fetchWorkspaces()]);
    }

    async function signup(email: string, password: string, name: string, orgName: string) {
      const res = await api.post("/auth/signup", { email, password, name, orgName });
      const { token: t, userId: uid, orgId: oid } = res.data.data;
      setSession(t, uid, oid);
      await Promise.all([fetchMe(), fetchWorkspaces()]);
    }

    async function switchWorkspace(targetOrgId: string) {
      if (!token.value || targetOrgId === orgId.value) return;
      const res = await api.post("/auth/workspaces/switch", { orgId: targetOrgId });
      const { token: t, orgId: oid, role } = res.data.data;
      token.value = t;
      orgId.value = oid;
      userRole.value = role;
      await fetchWorkspaces();
    }

    async function createWorkspace(name: string) {
      const res = await api.post("/auth/workspaces", { name });
      const { token: t, orgId: oid, role } = res.data.data;
      token.value = t;
      orgId.value = oid;
      userRole.value = role;
      await fetchWorkspaces();
    }

    function logout() {
      clearSession();
    }

    /** Called once at app startup. Validates the persisted token (if any). */
    async function hydrate() {
      if (hydrated.value) return;
      hydrated.value = true;
      if (token.value) await Promise.all([fetchMe(), fetchWorkspaces()]);
    }

    return {
      token,
      userId,
      orgId,
      userName,
      userEmail,
      userRole,
      workspaces,
      hydrated,
      isAuthenticated,
      currentWorkspace,
      login,
      signup,
      logout,
      fetchMe,
      fetchWorkspaces,
      switchWorkspace,
      createWorkspace,
      hydrate,
    };
  },
  {
    persist: {
      key: "dp_auth",
      paths: ["token", "userId", "orgId", "userName", "userEmail", "userRole"],
    },
  },
);
