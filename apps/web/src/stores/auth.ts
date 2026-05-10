import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { api } from "@/lib/api.js";

export const useAuthStore = defineStore("auth", () => {
  const token = ref<string | null>(localStorage.getItem("dp_token"));
  const userId = ref<string | null>(localStorage.getItem("dp_user_id"));
  const orgId = ref<string | null>(localStorage.getItem("dp_org_id"));
  const userName = ref<string | null>(null);
  const userEmail = ref<string | null>(null);
  const userRole = ref<string | null>(null);

  const isAuthenticated = computed(() => !!token.value);

  function setSession(t: string, uid: string, oid: string) {
    token.value = t;
    userId.value = uid;
    orgId.value = oid;
    localStorage.setItem("dp_token", t);
    localStorage.setItem("dp_user_id", uid);
    localStorage.setItem("dp_org_id", oid);
  }

  function clearSession() {
    token.value = null;
    userId.value = null;
    orgId.value = null;
    userName.value = null;
    userEmail.value = null;
    userRole.value = null;
    localStorage.removeItem("dp_token");
    localStorage.removeItem("dp_user_id");
    localStorage.removeItem("dp_org_id");
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

  return {
    token,
    userId,
    orgId,
    userName,
    userEmail,
    userRole,
    isAuthenticated,
    login,
    signup,
    logout,
    fetchMe,
  };
});
