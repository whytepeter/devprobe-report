<!--
  ConnectStateForm
  ────────────────
  Form for the "needs extension id" state. Validates the id with zod and
  posts a `submit` to the parent when valid. Loading / error are passed in.
-->
<template>
  <form class="space-y-3" @submit="onSubmit" novalidate>
    <p class="text-sm text-muted-foreground">
      Open <span class="font-mono">chrome://extensions</span>, enable Developer mode, and paste the DevProbe extension id below.
    </p>

    <FormField name="extId" v-slot="{ componentField }">
      <FormItem>
        <FormLabel>Extension id</FormLabel>
        <FormControl>
          <Input
            class="font-mono text-xs"
            placeholder="abcdefghijklmnopqrstuvwxyz123456"
            maxlength="32"
            autocomplete="off"
            :disabled="sending"
            v-bind="componentField"
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <p v-if="error" class="text-xs text-destructive">{{ error }}</p>

    <Button type="submit" class="w-full" :disabled="sending">
      {{ sending ? "Connecting…" : "Connect extension" }}
    </Button>
  </form>
</template>

<script setup lang="ts">
import { watch } from "vue";
import { z } from "zod";
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
import { EXT_ID_RE } from "@/features/extension-connect/utils/extension-id.js";

const props = defineProps<{
  initialExtId: string;
  sending: boolean;
  error: string;
}>();

const emit = defineEmits<{ submit: [extId: string] }>();

const ExtIdSchema = z.object({
  extId: z.string().regex(EXT_ID_RE, "That doesn't look like a valid Chrome extension id."),
});

const { handleSubmit, setFieldValue } = useForm({
  validationSchema: toTypedSchema(ExtIdSchema),
  initialValues: { extId: props.initialExtId },
});

// Keep the field in sync when the page auto-populates it from ?ext=…
watch(
  () => props.initialExtId,
  (next) => setFieldValue("extId", next),
);

const onSubmit = handleSubmit((values) => emit("submit", values.extId));
</script>
