<template>
  <AuthLayout title="Welcome back" subtitle="Sign in to your DevProbe workspace.">
    <LoginForm :submit="handleLogin" />

    <p class="text-xs text-muted-foreground text-center">
      No account?
      <RouterLink to="/signup" class="text-primary underline-offset-4 hover:underline">
        Create one
      </RouterLink>
    </p>
  </AuthLayout>
</template>

<script setup lang="ts">
import { useRouter, useRoute, RouterLink } from "vue-router";
import AuthLayout from "@/features/auth/components/AuthLayout.vue";
import LoginForm from "@/features/auth/components/LoginForm.vue";
import { useAuthStore } from "@/features/auth/auth.store.js";
import type { LoginInput } from "@deveprobe/shared";

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

async function handleLogin(values: LoginInput) {
  await auth.login(values.email, values.password);
  const redirect = (route.query["redirect"] as string) ?? "/dashboard";
  router.push(redirect);
}
</script>
