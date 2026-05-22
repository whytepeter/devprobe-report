import { createApp } from "vue";
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import { VueQueryPlugin, QueryClient } from "@tanstack/vue-query";
import App from "./App.vue";
import router from "@/app/router.js";
import "./assets/main.css";
import { useTheme } from "@/shared/composables/useTheme.js";
import { useAuthStore } from "@/features/auth/auth.store.js";

// Apply saved/system theme before first render to avoid flash
useTheme();

const app = createApp(App);

// ── Pinia ────────────────────────────────────────────────────────────────────
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);
app.use(pinia);

// ── Vue Router ──────────────────────────────────────────────────────────────
app.use(router);

// ── TanStack Query ──────────────────────────────────────────────────────────
// Owns server-state caching for every `useQuery` / `useMutation` in the app.
// Defaults tuned for a workspace app: stale after 30s so list views feel
// snappy without showing wildly out-of-date data; cache survives a brief
// route change (gcTime 5min) so going back to a page doesn't refetch.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:           30_000,
      gcTime:              5 * 60_000,
      refetchOnWindowFocus:false,
      retry:               1,
    },
  },
});
app.use(VueQueryPlugin, { queryClient });

// ── Boot ────────────────────────────────────────────────────────────────────
// Hydrate auth before mounting so the guard can decide on first navigation.
const auth = useAuthStore();
auth.hydrate().finally(() => app.mount("#app"));
