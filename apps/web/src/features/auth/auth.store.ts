import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { api } from "@/shared/lib/api.js";

/**
 * Auth store
 * ──────────
 * Holds session token, user identity, and org membership.
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
    const hydrated = ref(false);

    const isAuthenticated = computed(() => !!token.value);

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

    async function login(email: string, password: string) {
      const res = await api.post("/auth/login", { email, password });
      const { token: t, userId: uid, orgId: oid } = res.data.data;
      setSession(t, uid, oid);
      await fetchMe();
    }

    async function signup(email: string, password: string, name: string, orgName: string) {
      const res = await api.post("/auth/signup", { email, password, name, orgName });
      const { token: t, userId: uid, orgId: oid } = res.data.data;
      setSession(t, uid, oid);
      await fetchMe();
    }

    function logout() {
      clearSession();
    }

    /** Called once at app startup. Validates the persisted token (if any). */
    async function hydrate() {
      if (hydrated.value) return;
      hydrated.value = true;
      if (token.value) await fetchMe();
    }

    return {
      token,
      userId,
      orgId,
      userName,
      userEmail,
      userRole,
      hydrated,
      isAuthenticated,
      login,
      signup,
      logout,
      fetchMe,
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
