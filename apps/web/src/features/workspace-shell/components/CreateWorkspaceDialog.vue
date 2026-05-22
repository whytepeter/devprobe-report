<template>
  <Dialog :open="open" @update:open="onOpenChange">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>New workspace</DialogTitle>
        <DialogDescription>
          Workspaces have their own folders, issues, and members.
        </DialogDescription>
      </DialogHeader>

      <form class="space-y-4" @submit.prevent="onSubmit" novalidate>
        <div class="space-y-1.5">
          <Label for="ws-name">Name</Label>
          <Input
            id="ws-name"
            v-model="name"
            placeholder="Acme"
            maxlength="100"
            autofocus
            :disabled="submitting"
          />
        </div>

        <p v-if="submitError" class="text-xs text-destructive">{{ submitError }}</p>

        <DialogFooter>
          <Button type="button" variant="ghost" :disabled="submitting" @click="emit('update:open', false)">
            Cancel
          </Button>
          <Button type="submit" :loading="submitting" :disabled="!name.trim()">
            {{ submitting ? "Creating…" : "Create workspace" }}
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
  Label,
} from "@deveprobe/ui";
import { useAuthStore } from "@/features/auth/auth.store.js";

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{
  "update:open": [open: boolean];
  created: [];
}>();

const auth = useAuthStore();
const name = ref("");
const submitting = ref(false);
const submitError = ref("");

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return;
    name.value = "";
    submitError.value = "";
    submitting.value = false;
  },
);

async function onSubmit() {
  const trimmed = name.value.trim();
  if (!trimmed) return;
  submitError.value = "";
  submitting.value = true;
  try {
    await auth.createWorkspace(trimmed);
    emit("created");
    emit("update:open", false);
  } catch (e) {
    const msg = (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
    submitError.value = msg ?? (e as Error).message ?? "Could not create the workspace.";
  } finally {
    submitting.value = false;
  }
}

function onOpenChange(open: boolean) {
  if (submitting.value) return;
  emit("update:open", open);
}
</script>
