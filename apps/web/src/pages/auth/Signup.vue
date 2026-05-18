<template>
  <AuthLayout title="Create your workspace" subtitle="Start capturing issues in under a minute.">
    <SignupForm :submit="handleSignup" />

    <p class="text-xs text-muted-foreground text-center">
      Already have an account?
      <RouterLink to="/login" class="text-primary underline-offset-4 hover:underline">Sign in</RouterLink>
    </p>
  </AuthLayout>
</template>

<script setup lang="ts">
import { useRouter, RouterLink } from "vue-router";
import AuthLayout from "@/features/auth/components/AuthLayout.vue";
import SignupForm from "@/features/auth/components/SignupForm.vue";
import { useAuthStore } from "@/features/auth/auth.store.js";
import type { SignupInput } from "@deveprobe/shared";

const auth = useAuthStore();
const router = useRouter();

async function handleSignup(values: SignupInput) {
  await auth.signup(values.email, values.password, values.name, values.orgName);
  router.push("/issues");
}
</script>
