import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router/index.js";
import "./assets/main.css";
import { useTheme } from "./composables/useTheme.js";

// Apply saved/system theme before first render to avoid flash
useTheme();

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount("#app");
