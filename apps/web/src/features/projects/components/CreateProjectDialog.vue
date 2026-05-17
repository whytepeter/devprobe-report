<!--
  CreateProjectDialog
  ───────────────────
  Self-contained create flow:
   - shadcn-vue Dialog for modal shell
   - Form + FormField + Input/Textarea wired to vee-validate
   - Validated against the shared CreateProjectSchema (zod)
   - Auto-derives the slug from the name until the user edits the slug

  Emits `created` with the new Project so the parent can refresh whatever
  derived state it owns.
-->
<template>
  <Dialog :open="open" @update:open="onOpenChange">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>New project</DialogTitle>
        <DialogDescription>
          Projects group issues by app, repo, or product surface.
        </DialogDescription>
      </DialogHeader>

      <form class="space-y-4" @submit="onSubmit" novalidate>
        <FormField name="name" v-slot="{ componentField }">
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input
                placeholder="Web app"
                maxlength="100"
                autofocus
                :disabled="submitting"
                v-bind="componentField"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField name="slug" v-slot="{ componentField }">
          <FormItem>
            <FormLabel>Slug</FormLabel>
            <FormControl>
              <Input
                placeholder="web-app"
                maxlength="60"
                autocomplete="off"
                class="font-mono text-xs"
                :disabled="submitting"
                v-bind="componentField"
                @input="slugTouched = true"
              />
            </FormControl>
            <FormDescription>
              Lowercase letters, numbers, and dashes. Used in URLs.
            </FormDescription>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField name="description" v-slot="{ componentField }">
          <FormItem>
            <FormLabel>
              Description <span class="text-muted-foreground">(optional)</span>
            </FormLabel>
            <FormControl>
              <Textarea
                placeholder="What lives in this project?"
                maxlength="500"
                rows="2"
                :disabled="submitting"
                v-bind="componentField"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <p v-if="submitError" class="text-xs text-destructive">{{ submitError }}</p>

        <DialogFooter>
          <Button type="button" variant="ghost" :disabled="submitting" @click="emit('update:open', false)">
            Cancel
          </Button>
          <Button type="submit" :disabled="submitting">
            {{ submitting ? "Creating…" : "Create project" }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Textarea,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  useForm,
  toTypedSchema,
} from "@deveprobe/ui";
import { CreateProjectSchema, type CreateProjectInput, type Project } from "@deveprobe/shared";
import { slugify } from "@/features/projects/utils/slug.js";

const props = defineProps<{
  open: boolean;
  submit: (values: CreateProjectInput) => Promise<Project>;
}>();

const emit = defineEmits<{
  "update:open": [open: boolean];
  created: [project: Project];
}>();

const submitting = ref(false);
const submitError = ref("");
const slugTouched = ref(false);

const { handleSubmit, resetForm, setFieldValue, values } = useForm<CreateProjectInput>({
  validationSchema: toTypedSchema(CreateProjectSchema),
  initialValues: { name: "", slug: "", description: "" },
});

// Auto-derive slug from name until user touches the slug field.
// Reactive watcher beats event handlers — fires regardless of v-model wiring.
watch(
  () => values.name,
  (next) => {
    if (slugTouched.value) return;
    setFieldValue("slug", slugify(String(next ?? "")));
  },
);

// Re-sync when the dialog opens fresh: clear form + state.
watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return;
    submitting.value = false;
    submitError.value = "";
    slugTouched.value = false;
    resetForm({ values: { name: "", slug: "", description: "" } });
  },
);

const onSubmit = handleSubmit(async (raw) => {
  submitError.value = "";
  submitting.value = true;
  try {
    const payload: CreateProjectInput = {
      name: raw.name.trim(),
      slug: raw.slug.trim(),
      ...(raw.description?.trim() ? { description: raw.description.trim() } : {}),
    };
    const project = await props.submit(payload);
    emit("created", project);
    emit("update:open", false);
  } catch (e) {
    const msg = (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
    submitError.value = msg ?? (e as Error).message ?? "Could not create the project.";
  } finally {
    submitting.value = false;
  }
});

function onOpenChange(open: boolean) {
  if (submitting.value) return; // don't allow dismiss mid-submit
  emit("update:open", open);
}

</script>
