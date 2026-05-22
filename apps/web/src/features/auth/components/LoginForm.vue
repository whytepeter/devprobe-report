<!--
  LoginForm
  ─────────
  Self-contained form validated against the shared LoginSchema (zod) via
  vee-validate. The page passes a `submit` async fn that runs the login —
  this form owns the loading + error state.
-->
<template>
  <form class="space-y-4" @submit="onSubmit" novalidate>
    <FormField name="email" v-slot="{ componentField }">
      <FormItem>
        <FormLabel>Email</FormLabel>
        <FormControl>
          <Input
            type="email"
            placeholder="you@company.com"
            autocomplete="email"
            :disabled="submitting"
            v-bind="componentField"
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField name="password" v-slot="{ componentField }">
      <FormItem>
        <FormLabel>Password</FormLabel>
        <FormControl>
          <Input
            type="password"
            placeholder="••••••••"
            autocomplete="current-password"
            :disabled="submitting"
            v-bind="componentField"
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <p v-if="submitError" class="text-xs text-destructive">{{ submitError }}</p>

    <Button type="submit" class="w-full" :loading="submitting">
      {{ submitting ? "Signing in…" : "Sign in" }}
    </Button>
  </form>
</template>

<script setup lang="ts">
import { ref } from "vue";
import {
  Button,
  Input,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  useForm,
  toTypedSchema,
} from "@deveprobe/ui";
import { LoginSchema, type LoginInput } from "@deveprobe/shared";

const props = defineProps<{
  submit: (values: LoginInput) => Promise<void>;
}>();

const submitError = ref("");
const submitting = ref(false);

const { handleSubmit } = useForm({
  validationSchema: toTypedSchema(LoginSchema),
  initialValues: { email: "", password: "" },
});

const onSubmit = handleSubmit(async (values) => {
  submitError.value = "";
  submitting.value = true;
  try {
    await props.submit(values);
  } catch (e) {
    const msg = (
      e as { response?: { data?: { error?: { message?: string } } } }
    )?.response?.data?.error?.message;
    submitError.value =
      msg ?? (e as Error).message ?? "Invalid email or password.";
  } finally {
    submitting.value = false;
  }
});
</script>
