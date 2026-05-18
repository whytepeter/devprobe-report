import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/features/auth/auth.store.js";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      redirect: "/issues",
    },
    {
      path: "/login",
      name: "login",
      component: () => import("@/pages/auth/Login.vue"),
      meta: { public: true, hideForAuthed: true },
    },
    {
      path: "/signup",
      name: "signup",
      component: () => import("@/pages/auth/Signup.vue"),
      meta: { public: true, hideForAuthed: true },
    },
    {
      path: "/",
      component: () => import("@/features/workspace-shell/DashboardLayout.vue"),
      children: [
        {
          path: "issues",
          name: "issues",
          component: () => import("@/pages/issues/Issues.vue"),
        },
        {
          path: "issue/:id",
          name: "issue",
          component: () => import("@/pages/issues/Issue.vue"),
        },
        {
          path: "folders",
          name: "folders",
          component: () => import("@/pages/folders/Folders.vue"),
        },
        {
          path: "folder/:id",
          name: "folder",
          component: () => import("@/pages/folders/Folder.vue"),
        },
        {
          path: "integrations",
          name: "integrations",
          component: () => import("@/pages/integrations/Integrations.vue"),
        },
        {
          path: "settings",
          name: "settings",
          component: () => import("@/pages/settings/Settings.vue"),
        },
      ],
    },
    {
      path: "/extension/connect",
      name: "extension-connect",
      component: () => import("@/pages/extension-connect/ExtensionConnect.vue"),
      meta: { public: true },
    },
    {
      path: "/:pathMatch(.*)*",
      name: "not-found",
      component: () => import("@/pages/not-found/NotFound.vue"),
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
    return { name: "issues" };
  }
  return true;
});

export default router;
