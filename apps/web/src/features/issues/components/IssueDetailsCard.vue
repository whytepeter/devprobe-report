<!--
  IssueDetailsCard
  ────────────────
  Rounded panel that gathers the four primary scalar fields (Status,
  Severity, Assignee, Reporter) plus a tag chip row.

  Every dropdown writes through `useUpdateIssue` so the TanStack cache
  invalidates and the page reflects the change without a manual reload.

  Cross-cutting concerns kept narrow:
    • Select primitives + tag chip live here
    • Mutation routing → useUpdateIssue (the only side-effectful import)
    • Field-row layout / status colours → IssueDetailsCardField
-->
<template>
  <section class="rounded-xl border border-border bg-card/40 px-5 py-4">
    <!-- Four scalar columns -->
    <div class="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
      <!-- STATUS -->
      <IssueDetailsCardField label="Status">
        <Select :model-value="issue.status" @update:model-value="onStatus">
          <SelectTrigger class="h-8 w-full justify-between border-transparent bg-transparent hover:bg-muted/60 px-2 text-sm font-medium text-foreground/90">
            <span class="flex items-center gap-2 truncate">
              <span :class="['h-1.5 w-1.5 shrink-0 rounded-full', statusDot]" />
              {{ statusLabel }}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="opt in STATUS_OPTS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </SelectItem>
          </SelectContent>
        </Select>
      </IssueDetailsCardField>

      <!-- SEVERITY -->
      <IssueDetailsCardField label="Severity">
        <Select :model-value="issue.severity ?? ''" @update:model-value="onSeverity">
          <SelectTrigger class="h-8 w-full justify-between border-transparent bg-transparent hover:bg-muted/60 px-2 text-sm font-medium text-foreground/90">
            <span class="truncate capitalize">{{ issue.severity ?? "—" }}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="opt in SEVERITY_OPTS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </SelectItem>
          </SelectContent>
        </Select>
      </IssueDetailsCardField>

      <!-- ASSIGNEE -->
      <IssueDetailsCardField label="Assignee">
        <Select :model-value="assigneeValue" @update:model-value="onAssignee">
          <SelectTrigger class="h-8 w-full justify-between border-transparent bg-transparent hover:bg-muted/60 px-2 text-sm font-medium text-foreground/90">
            <span class="flex items-center gap-2 min-w-0">
              <UserAvatar v-if="assignee" :user="assignee" size="xs" />
              <span class="truncate">{{ assigneeName }}</span>
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__unassigned__">Unassigned</SelectItem>
            <!-- Loading / empty hints surfaced inline so an empty dropdown
                 doesn't read as "no other members". -->
            <div
              v-if="membersLoading"
              class="px-2 py-1.5 text-[12px] text-muted-foreground italic"
            >Loading…</div>
            <div
              v-else-if="members.length === 0"
              class="px-2 py-1.5 text-[12px] text-muted-foreground italic"
            >No teammates yet</div>
            <SelectItem v-for="m in members" :key="m.id" :value="m.id">
              {{ m.name ?? m.email ?? m.id.slice(0, 6) }}
            </SelectItem>
          </SelectContent>
        </Select>
      </IssueDetailsCardField>

      <!-- REPORTER (read-only) -->
      <IssueDetailsCardField label="Reporter">
        <div class="flex items-center gap-2 px-2 h-8 text-sm font-medium text-foreground/90 min-w-0">
          <UserAvatar v-if="issue.createdBy" :user="issue.createdBy" size="xs" />
          <span class="truncate">{{ reporterName }}</span>
        </div>
      </IssueDetailsCardField>
    </div>

    <!-- TAGS -->
    <IssueDetailsCardField label="Tags" class="mt-4">
      <div class="flex flex-wrap items-center gap-1.5">
        <span
          v-for="tag in tags"
          :key="tag"
          class="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[11px] text-primary"
        >
          # {{ tag }}
          <button
            type="button"
            class="text-primary/50 hover:text-primary transition-colors"
            :aria-label="`Remove tag ${tag}`"
            @click="removeTag(tag)"
          >
            <Icon name="x" :size="10" :stroke-width="2.5" />
          </button>
        </span>

        <!-- Inline input or "+ Add" affordance -->
        <input
          v-if="addingTag"
          ref="tagInput"
          v-model="newTag"
          type="text"
          placeholder="tag"
          class="w-20 rounded-md border border-primary/30 bg-background px-2 py-0.5 font-mono text-[11px] text-foreground outline-none focus:border-primary"
          @keydown.enter.prevent="commitTag"
          @keydown.escape="cancelTag"
          @blur="commitTag"
        />
        <button
          v-else
          type="button"
          class="inline-flex items-center gap-1 rounded-md border border-dashed border-border bg-background px-2 py-0.5 font-mono text-[11px] text-muted-foreground hover:border-foreground/40 hover:text-foreground transition-colors"
          @click="startAddTag"
        >
          <Icon name="plus" :size="10" :stroke-width="2.5" />
          Add
        </button>
      </div>
    </IssueDetailsCardField>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import {
  Icon,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@deveprobe/ui";
import IssueDetailsCardField from "@/features/issues/components/IssueDetailsCardField.vue";
import UserAvatar           from "@/features/issues/components/UserAvatar.vue";
import { useUpdateIssue }     from "@/features/issues/composables/useIssueMutations.js";
import { useWorkspaceMembers } from "@/features/issues/composables/useWorkspaceMembers.js";
import type { Issue, IssueStatus, Severity } from "@deveprobe/shared";

type PublicUser = { id: string; name: string | null; email: string | null; avatarUrl: string | null };
type IssueWithPeople = Issue & {
  createdBy?: PublicUser | null;
  assignee?:  PublicUser | null;
};

const props = defineProps<{ issue: IssueWithPeople }>();

// ── Mutations + reference data ──────────────────────────────────────────────
const update = useUpdateIssue();
const membersQuery = useWorkspaceMembers();
// Always an array — `useQuery.data` is undefined until the first response
// resolves, which would cause the v-for in the assignee dropdown to render
// nothing (looks broken when the workspace has members).
const members        = computed(() => membersQuery.data.value ?? []);
const membersLoading = computed(() => membersQuery.isPending.value);

function patch(p: Parameters<typeof update.mutateAsync>[0]["patch"]) {
  return update.mutateAsync({ id: props.issue.id, patch: p });
}

// ── Status ──────────────────────────────────────────────────────────────────
const STATUS_OPTS: { value: IssueStatus; label: string }[] = [
  { value: "draft",                 label: "Draft" },
  { value: "open",                  label: "Open" },
  { value: "triaged",               label: "Triaged" },
  { value: "in_progress",           label: "In progress" },
  { value: "awaiting_verification", label: "Awaiting verification" },
  { value: "resolved",              label: "Resolved" },
  { value: "verified",              label: "Verified" },
  { value: "reopened",              label: "Reopened" },
  { value: "archived",              label: "Archived" },
];

const STATUS_DOT: Record<string, string> = {
  open: "bg-violet-500", draft: "bg-neutral-400", triaged: "bg-sky-500",
  in_progress: "bg-amber-500", awaiting_verification: "bg-blue-500",
  resolved: "bg-emerald-500", verified: "bg-emerald-600",
  reopened: "bg-rose-500", archived: "bg-neutral-400",
};
const statusDot   = computed(() => STATUS_DOT[props.issue.status] ?? "bg-neutral-400");
const statusLabel = computed(() =>
  props.issue.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
);

function onStatus(v: unknown) {
  if (typeof v !== "string" || v === props.issue.status) return;
  void patch({ status: v as IssueStatus });
}

// ── Severity ────────────────────────────────────────────────────────────────
const SEVERITY_OPTS: { value: Severity; label: string }[] = [
  { value: "low",      label: "Low" },
  { value: "medium",   label: "Medium" },
  { value: "high",     label: "High" },
  { value: "critical", label: "Critical" },
];

function onSeverity(v: unknown) {
  if (typeof v !== "string" || v === props.issue.severity) return;
  void patch({ severity: v as Severity });
}

// ── Assignee ────────────────────────────────────────────────────────────────
// "__unassigned__" sentinel because shadcn Select disallows empty-string values.
const UNASSIGNED = "__unassigned__";

const assignee = computed<PublicUser | null>(() => props.issue.assignee ?? null);
const assigneeValue = computed(() => props.issue.assigneeId ?? UNASSIGNED);
const assigneeName  = computed(() =>
  assignee.value?.name ?? assignee.value?.email ?? "Unassigned",
);
const reporterName  = computed(() =>
  props.issue.createdBy?.name ?? props.issue.createdBy?.email ?? "Unknown",
);

function onAssignee(v: unknown) {
  if (typeof v !== "string") return;
  const next = v === UNASSIGNED ? null : v;
  if (next === props.issue.assigneeId) return;
  void patch({ assigneeId: next });
}

// ── Tags ────────────────────────────────────────────────────────────────────
const tags = computed<string[]>(() => {
  const raw = props.issue.labels;
  return Array.isArray(raw) ? raw.filter((t): t is string => typeof t === "string") : [];
});

const addingTag = ref(false);
const newTag    = ref("");
const tagInput  = ref<HTMLInputElement | null>(null);

async function startAddTag() {
  addingTag.value = true;
  newTag.value    = "";
  await nextTick();
  tagInput.value?.focus();
}

function normaliseTag(raw: string): string {
  return raw.trim().replace(/^#/, "").toLowerCase();
}

async function commitTag() {
  const t = normaliseTag(newTag.value);
  addingTag.value = false;
  newTag.value    = "";
  if (!t || tags.value.includes(t)) return;
  await patch({ labels: [...tags.value, t] });
}

function cancelTag() {
  addingTag.value = false;
  newTag.value    = "";
}

async function removeTag(tag: string) {
  await patch({ labels: tags.value.filter((t) => t !== tag) });
}
</script>
