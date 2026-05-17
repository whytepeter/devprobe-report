import { createApp } from "vue";
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import App from "./App.vue";
import router from "@/app/router.js";
import "./assets/main.css";
import { useTheme } from "@/shared/composables/useTheme.js";
import { useAuthStore } from "@/features/auth/auth.store.js";

// Apply saved/system theme before first render to avoid flash
useTheme();

const app = createApp(App);
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);
app.use(pinia);
app.use(router);

// Hydrate auth before mounting so the guard can decide on first navigation.
const auth = useAuthStore();
auth.hydrate().finally(() => app.mount("#app"));
