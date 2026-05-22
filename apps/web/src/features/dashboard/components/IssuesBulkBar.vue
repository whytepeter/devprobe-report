<!--
  IssuesBulkBar
  ─────────────
  Floating action bar at the bottom of the Issues page. Renders only while
  there's an active selection. Actions:

    • Set status   — quick-set Open / In progress / Resolved
    • Move to…     — popover with the folder list + "No folder" (root)
    • Delete       — confirms inline (the bar replaces itself with a
                     "Delete N issues? Yes / Cancel" row for one click)

  Owns the destructive confirm state itself so the parent doesn't have to
  thread it. Mutations route through `useBulkUpdateIssues` so TanStack
  invalidations keep the list cache fresh.
-->
<template>
  <Transition
    enter-active-class="transition-all duration-150 ease-out"
    enter-from-class="opacity-0 translate-y-2"
    leave-active-class="transition-all duration-100 ease-in"
    leave-to-class="opacity-0 translate-y-2"
  >
    <div
      v-if="selection.hasSelection.value"
      class="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 pointer-events-auto"
    >
      <!-- Confirm delete inline -->
      <div
        v-if="confirmingDelete"
        class="flex items-center gap-3 rounded-full border border-rose-500/30 bg-rose-50/95 px-4 py-2 shadow-lg backdrop-blur-md dark:bg-rose-500/10"
      >
        <span class="text-[13px] text-rose-700 dark:text-rose-300">
          Delete <strong>{{ selection.count.value }}</strong>
          {{ selection.count.value === 1 ? "issue" : "issues" }}?
        </span>
        <Button variant="ghost" size="sm" :disabled="busy" @click="confirmingDelete = false">Cancel</Button>
        <Button variant="destructive" size="sm" :loading="busy" @click="onDelete">Delete</Button>
      </div>

      <!-- Default bar -->
      <div
        v-else
        class="flex items-center gap-2 rounded-full border border-border bg-card/95 px-3 py-2 shadow-lg backdrop-blur-md"
      >
        <span class="px-1.5 text-[12px] text-foreground/85 tabular-nums">
          <strong class="text-foreground">{{ selection.count.value }}</strong>
          selected
        </span>

        <span class="h-4 w-px bg-border" aria-hidden="true" />

        <!-- Set status -->
        <Select :model-value="''" @update:model-value="onSetStatus">
          <SelectTrigger class="h-8 w-auto gap-1.5 rounded-md border-border bg-background px-2.5 text-[12px]">
            <Icon name="circle-dot" :size="13" :stroke-width="1.75" class="text-muted-foreground" />
            Set status
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In progress</SelectItem>
            <SelectItem value="awaiting_verification">Awaiting verification</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="reopened">Reopened</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>

        <!-- Move to folder -->
        <Select :model-value="''" @update:model-value="onMove">
          <SelectTrigger class="h-8 w-auto gap-1.5 rounded-md border-border bg-background px-2.5 text-[12px]">
            <Icon name="folder" :size="13" :stroke-width="1.75" class="text-muted-foreground" />
            Move to…
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__root__">No folder (root)</SelectItem>
            <SelectItem v-for="f in folders" :key="f.id" :value="f.id">
              {{ f.name }}
            </SelectItem>
          </SelectContent>
        </Select>

        <!-- Delete -->
        <Button variant="ghost" size="sm" class="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-500/10" @click="confirmingDelete = true">
          <Icon name="trash-2" :size="13" :stroke-width="1.75" />
          Delete
        </Button>

        <span class="h-4 w-px bg-border" aria-hidden="true" />

        <Button variant="ghost" size="icon-sm" aria-label="Clear selection" @click="selection.clear()">
          <Icon name="x" :size="14" :stroke-width="1.75" />
        </Button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import {
  Button,
  Icon,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@deveprobe/ui";
import { useIssueSelection } from "@/features/dashboard/composables/useIssueSelection.js";
import { useBulkUpdateIssues } from "@/features/issues/composables/useIssueMutations.js";
import { useFolders } from "@/features/folders/composables/useFolders.js";
import type { IssueStatus } from "@deveprobe/shared";

const selection = useIssueSelection();
const bulk      = useBulkUpdateIssues();
const { folders } = useFolders();

const confirmingDelete = ref(false);
const busy = computed(() => bulk.isPending.value);

async function onSetStatus(next: unknown) {
  if (!next || typeof next !== "string") return;
  await bulk.mutateAsync({
    action: "set-status",
    ids:    selection.selectedIds.value,
    status: next as IssueStatus,
  });
  selection.clear();
}

async function onMove(target: unknown) {
  if (!target || typeof target !== "string") return;
  const folderId = target === "__root__" ? null : target;
  await bulk.mutateAsync({
    action: "move-to-folder",
    ids:    selection.selectedIds.value,
    folderId,
  });
  selection.clear();
}

async function onDelete() {
  await bulk.mutateAsync({ action: "delete", ids: selection.selectedIds.value });
  confirmingDelete.value = false;
  selection.clear();
}
</script>
