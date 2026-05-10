<template>
  <div class="min-h-screen bg-[var(--bg-base)] flex items-center justify-center px-4">
    <div class="w-full max-w-sm">
      <div class="mb-8">
        <h1 class="text-xl font-semibold text-[var(--text-primary)]">DevProbe</h1>
        <p class="text-sm text-[var(--text-muted)] mt-1">Create your workspace</p>
      </div>

      <form @submit.prevent="submit" class="space-y-4">
        <div>
          <label class="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Your name</label>
          <Input v-model="name" type="text" placeholder="Ada Lovelace" required />
        </div>
        <div>
          <label class="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Workspace name</label>
          <Input v-model="orgName" type="text" placeholder="Acme Inc" required />
        </div>
        <div>
          <label class="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Email</label>
          <Input v-model="email" type="email" placeholder="you@company.com" required autocomplete="email" />
        </div>
        <div>
          <label class="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Password</label>
          <Input v-model="password" type="password" placeholder="Min 8 characters" required autocomplete="new-password" />
        </div>

        <p v-if="error" class="text-xs text-red-400">{{ error }}</p>

        <Button type="submit" variant="default" class="w-full" :disabled="loading">
          {{ loading ? "Creating workspace…" : "Create workspace" }}
        </Button>
      </form>

      <p class="mt-6 text-xs text-[var(--text-muted)] text-center">
        Already have an account?
        <RouterLink to="/login" class="text-primary underline-offset-4 hover:underline">Sign in</RouterLink>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter, RouterLink } from "vue-router";
import { Button, Input } from "@deveprobe/ui";
import { useAuthStore } from "@/stores/auth.js";

const auth = useAuthStore();
const router = useRouter();

const name = ref("");
const orgName = ref("");
const email = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);

async function submit() {
  error.value = "";
  loading.value = true;
  try {
    await auth.signup(email.value, password.value, name.value, orgName.value);
    router.push("/dashboard");
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
    error.value = msg ?? "Something went wrong";
  } finally {
    loading.value = false;
  }
}
</script>
