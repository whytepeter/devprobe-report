import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/features/auth/auth.store.js";

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
      component: () => import("@/features/auth/LoginPage.vue"),
      meta: { public: true, hideForAuthed: true },
    },
    {
      path: "/signup",
      name: "signup",
      component: () => import("@/features/auth/SignupPage.vue"),
      meta: { public: true, hideForAuthed: true },
    },
    {
      path: "/",
      component: () => import("@/features/workspace-shell/DashboardLayout.vue"),
      children: [
        {
          path: "dashboard",
          name: "dashboard",
          component: () => import("@/features/dashboard/DashboardPage.vue"),
        },
        {
          path: "issue/:id",
          name: "issue",
          component: () => import("@/features/issues/IssuePage.vue"),
        },
        {
          path: "projects",
          name: "projects",
          component: () => import("@/features/projects/ProjectsPage.vue"),
        },
        {
          path: "settings",
          name: "settings",
          component: () => import("@/features/settings/SettingsPage.vue"),
        },
      ],
    },
    {
      path: "/extension/connect",
      name: "extension-connect",
      component: () => import("@/features/extension-connect/ExtensionConnectPage.vue"),
      meta: { public: true },
    },
    {
      path: "/:pathMatch(.*)*",
      name: "not-found",
      component: () => import("@/features/not-found/NotFoundPage.vue"),
      meta: { public: true },
    },
  ],
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (!to.meta["public"] && !auth.isAuthenticated) {
    return { name: "login", query: { redirect: to.fullPath } };
  }
  if (to.meta["hideForAuthed"] && auth.isAuthenticated) {
    return { name: "dashboard" };
  }
  return true;
});

export default router;
