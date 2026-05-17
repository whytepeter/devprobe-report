<template>
  <form class="space-y-4" @submit="onSubmit" novalidate>
    <FormField name="name" v-slot="{ componentField }">
      <FormItem>
        <FormLabel>Your name</FormLabel>
        <FormControl>
          <Input
            type="text"
            placeholder="Ada Lovelace"
            autocomplete="name"
            :disabled="submitting"
            v-bind="componentField"
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField name="orgName" v-slot="{ componentField }">
      <FormItem>
        <FormLabel>Workspace name</FormLabel>
        <FormControl>
          <Input
            type="text"
            placeholder="Acme Inc"
            autocomplete="organization"
            :disabled="submitting"
            v-bind="componentField"
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

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
            placeholder="At least 8 characters"
            autocomplete="new-password"
            :disabled="submitting"
            v-bind="componentField"
          />
        </FormControl>
        <FormDescription>Used to sign back into your workspace.</FormDescription>
        <FormMessage />
      </FormItem>
    </FormField>

    <p v-if="submitError" class="text-xs text-destructive">{{ submitError }}</p>

    <Button type="submit" class="w-full" :disabled="submitting">
      {{ submitting ? "Creating workspace…" : "Create workspace" }}
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
  FormDescription,
  FormMessage,
  useForm,
  toTypedSchema,
} from "@deveprobe/ui";
import { SignupSchema, type SignupInput } from "@deveprobe/shared";

const props = defineProps<{
  submit: (values: SignupInput) => Promise<void>;
}>();

const submitError = ref("");
const submitting = ref(false);

const { handleSubmit } = useForm({
  validationSchema: toTypedSchema(SignupSchema),
  initialValues: { name: "", orgName: "", email: "", password: "" },
});

const onSubmit = handleSubmit(async (values) => {
  submitError.value = "";
  submitting.value = true;
  try {
    await props.submit(values);
  } catch (e) {
    const msg = (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
    submitError.value = msg ?? (e as Error).message ?? "Something went wrong.";
  } finally {
    submitting.value = false;
  }
});
</script>
