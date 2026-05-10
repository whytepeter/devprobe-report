import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth.js";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      redirect: "/dashboard",
    },
    {
      path: "/login",
      name: "login",
      component: () => import("@/pages/LoginPage.vue"),
      meta: { public: true },
    },
    {
      path: "/signup",
      name: "signup",
      component: () => import("@/pages/SignupPage.vue"),
      meta: { public: true },
    },
    {
      path: "/",
      component: () => import("@/layouts/DashboardLayout.vue"),
      children: [
        {
          path: "dashboard",
          name: "dashboard",
          component: () => import("@/pages/DashboardPage.vue"),
        },
        {
          path: "issue/:id",
          name: "issue",
          component: () => import("@/pages/IssuePage.vue"),
        },
        {
          path: "projects",
          name: "projects",
          component: () => import("@/pages/ProjectsPage.vue"),
        },
        {
          path: "settings",
          name: "settings",
          component: () => import("@/pages/SettingsPage.vue"),
        },
      ],
    },
    {
      path: "/extension/connect",
      name: "extension-connect",
      component: () => import("@/pages/ExtensionConnectPage.vue"),
      meta: { public: true },
    },
    {
      path: "/:pathMatch(.*)*",
      name: "not-found",
      component: () => import("@/pages/NotFoundPage.vue"),
      meta: { public: true },
    },
  ],
});

// Auth guard — wired in Phase 2 when API auth is live
// router.beforeEach((to) => {
//   const auth = useAuthStore();
//   if (!to.meta["public"] && !auth.isAuthenticated) {
//     return { name: "login", query: { redirect: to.fullPath } };
//   }
// });

export default router;
