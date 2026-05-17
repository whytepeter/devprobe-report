import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

/** Pinia-persistedstate stores the auth slice as JSON under "dp_auth". */
function readToken(): string | null {
  try {
    const raw = localStorage.getItem("dp_auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { token?: string | null };
    return parsed.token ?? null;
  } catch {
    return null;
  }
}

api.interceptors.request.use((config) => {
  const token = readToken();
  if (token) config.headers["Authorization"] = `Bearer ${token}`;
  return config;
});

/**
 * 401 handler: clear the persisted session and bounce to /login.
 * The redirect preserves the current path so the user lands back where they were.
 * Pages that want to render an unauthorised state inline (e.g. IssuePage) should
 * check `isAuthenticated` *before* calling the API so this never fires for them.
 */
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && window.location.pathname !== "/login") {
      localStorage.removeItem("dp_auth");
      const here = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?redirect=${here}`;
    }
    return Promise.reject(err);
  },
);
