import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "../../assets/main.css";
import { getTheme, applyThemeClass, watchTheme } from "../../lib/theme.js";

// Initialise theme then mount — wrapped in IIFE because top-level await is
// not supported in the browser build target (chrome87 / es2020).
(async () => {
  const theme = await getTheme();
  applyThemeClass(document.documentElement, theme);

  // Keep in sync if the user changes the theme from another context
  watchTheme(document.documentElement);

  const app = createApp(App);
  app.use(createPinia());
  app.mount("#app");
})();
