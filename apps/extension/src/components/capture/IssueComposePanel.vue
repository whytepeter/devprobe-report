<!--
  IssueComposePanel
  ─────────────────
  Right-side form panel for PostComposeModal (shadow DOM).
  Title + description fills the available height. Metadata at the bottom.
-->
<template>
  <div ref="rootEl" class="flex h-full flex-col bg-card">
    <!-- Header -->
    <div
      class="flex shrink-0 items-center gap-2.5 px-5 py-3.5 border-b border-border"
    >
      <span
        class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary"
      >
        <Icon name="hexagon" :size="12" color="#fff" :stroke-width="2.5" />
      </span>
      <div class="flex-1 min-w-0">
        <p class="text-[13px] font-semibold leading-none text-foreground">
          New Issue
        </p>
        <p
          v-if="pageUrl"
          class="mt-0.5 truncate text-[11px] text-muted-foreground"
        >
          {{ pageUrl }}
        </p>
      </div>
    </div>

    <!-- Body -->
    <div class="relative flex-1 min-h-0">
      <slot v-if="screen === 'success'" name="success" />

      <form
        v-else
        class="flex h-full flex-col"
        :class="{ 'pointer-events-none opacity-70': submitting }"
        @submit.prevent="onSubmit"
      >
        <!-- Title + description — fills all available space -->
        <div class="flex flex-1 flex-col min-h-0 px-5 pt-4 pb-3">
          <input
            v-model="form.title"
            :disabled="submitting"
            class="block w-full bg-transparent border-0 outline-none p-0 appearance-none shadow-none text-[19px] font-semibold leading-snug tracking-[-0.01em] text-foreground placeholder:text-muted-foreground/60 focus:ring-0 font-sans shrink-0 disabled:cursor-not-allowed"
            placeholder="Issue title"
            maxlength="180"
            autofocus
          />
          <textarea
            v-model="form.summary"
            :disabled="submitting"
            class="mt-2.5 block w-full flex-1 min-h-0 bg-transparent border-0 outline-none p-0 appearance-none shadow-none resize-none leading-[1.6] text-[13px] text-muted-foreground placeholder:text-muted-foreground/60 focus:ring-0 font-sans disabled:cursor-not-allowed"
            placeholder="Describe what happened…"
          />
        </div>

        <!-- Divider -->
        <div class="mx-5 h-px bg-border shrink-0" />

        <!-- Metadata section -->
        <div class="shrink-0 px-5 py-4 space-y-4">
          <!-- Severity -->
          <div class="space-y-2">
            <p
              class="text-[10px] font-semibold uppercase tracking-[0.07em] text-muted-foreground/70"
            >
              Severity
            </p>
            <div class="flex flex-wrap gap-1.5">
              <Button
                v-for="s in SEVERITIES"
                :key="s.value"
                type="button"
                size="xs"
                :disabled="submitting"
                :class="[
                  'rounded-full gap-1.5 focus-visible:ring-0 focus-visible:ring-offset-0',
                  form.severity === s.value
                    ? `${s.activeBg} ${s.activeText} ${s.activeBorder}`
                    : 'bg-background',
                ]"
                @click="form.severity = s.value"
              >
                <span
                  class="h-[5px] w-[5px] rounded-full shrink-0"
                  :class="s.dotColor"
                />
                {{ s.label }}
              </Button>
            </div>
          </div>

          <!-- Project — native select (shadow DOM safe) -->
          <div class="space-y-1.5">
            <p
              class="text-[10px] font-semibold uppercase tracking-[0.07em] text-muted-foreground/70"
            >
              Project
            </p>

            <div
              v-if="projectsLoading"
              class="text-[12px] text-muted-foreground italic"
            >
              Loading projects…
            </div>

            <div
              v-else-if="projectsLoadError"
              class="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 space-y-1"
            >
              <p class="text-[12px] font-medium text-destructive">
                Couldn't load projects
              </p>
              <p class="text-[11px] leading-snug text-destructive/80 break-all">
                {{ projectsLoadError }}
              </p>
            </div>

            <div
              v-else-if="projects.length === 0"
              class="rounded-lg border border-dashed border-border bg-secondary/40 px-3 py-2.5 space-y-2"
            >
              <p class="text-[12px] leading-snug text-muted-foreground">
                Your workspace has no projects yet. Projects are how DevProbe
                groups issues — usually one per app or repo.
              </p>
              <a
                :href="`${WEB_APP_URL}/projects`"
                target="_blank"
                rel="noopener"
                class="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
              >
                Create one in the web app
                <Icon name="arrow-up-right" :size="11" :stroke-width="2" />
              </a>
            </div>

            <Select v-else v-model="form.projectId" :disabled="submitting">
              <SelectTrigger
                :disabled="submitting"
                class="w-full text-xs text-foreground font-normal gap-2 px-2.5 disabled:cursor-not-allowed"
              >
                <Icon name="folder-open" :size="12" :stroke-width="1.75" class="shrink-0 text-muted-foreground" />
                <SelectValue placeholder="Pick a project" />
              </SelectTrigger>
              <SelectContent :to="shadowRoot ?? undefined">
                <SelectItem v-for="p in projects" :key="p.id" :value="p.id">
                  <span class="flex items-baseline gap-2">
                    <span>{{ p.name }}</span>
                    <span class="font-mono text-[10px] text-muted-foreground">{{ p.slug }}</span>
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- Error -->
          <div
            v-if="error"
            class="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive"
          >
            <Icon name="alert-circle" :size="12" class="mt-px shrink-0" />
            {{ error }}
          </div>
        </div>
      </form>
    </div>

    <!-- Footer -->
    <div v-if="screen !== 'success'" class="shrink-0 border-t border-border">
      <!-- Sharing row -->
      <div class="px-4 pt-3 pb-2">
        <Select v-model="form.visibility" :disabled="submitting">
          <SelectTrigger :disabled="submitting">
            <Icon
              name="link"
              :size="13"
              class="shrink-0 text-muted-foreground"
            />
            <SelectValue />
          </SelectTrigger>
          <SelectContent :to="shadowRoot ?? undefined">
            <SelectItem value="public">Anyone with the link</SelectItem>
            <SelectItem value="private">Only people in this workspace</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <!-- Action buttons -->
      <div class="flex items-center gap-2 px-4 pb-4">
        <Button
          variant="default"
          class="flex-1 gap-1.5"
          :disabled="!canSubmit || submitting"
          @click="onSubmit"
        >
          <span
            v-if="submitting"
            class="h-3 w-3 rounded-full border-[1.5px] border-primary-foreground border-t-transparent animate-spin"
          />
          <Icon
            v-else
            name="send"
            :size="13"
            :stroke-width="2.5"
            class="shrink-0"
          />
          {{ submitting ? "Creating…" : "Create issue" }}
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { Button, Icon, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@deveprobe/ui";
import { api } from "../../lib/api.js";
import { WEB_APP_URL } from "../../lib/env.js";
import { getAuth } from "../../lib/auth.js";
import type { Project } from "@deveprobe/shared";

export interface ComposeForm {
  title: string;
  summary: string;
  severity: string;
  projectId: string;
  visibility: string;
}

defineProps<{
  submitting?: boolean;
  error?: string;
  screen?: "compose" | "success";
  pageUrl?: string;
}>();

const emit = defineEmits<{
  submit: [form: ComposeForm];
  cancel: [];
}>();

const SEVERITIES = [
  {
    value: "low",
    label: "Low",
    dotColor: "bg-green-500",
    activeBg: "bg-green-50",
    activeText: "text-green-700",
    activeBorder: "border-green-200",
  },
  {
    value: "medium",
    label: "Medium",
    dotColor: "bg-amber-400",
    activeBg: "bg-amber-50",
    activeText: "text-amber-700",
    activeBorder: "border-amber-200",
  },
  {
    value: "high",
    label: "High",
    dotColor: "bg-orange-400",
    activeBg: "bg-orange-50",
    activeText: "text-orange-700",
    activeBorder: "border-orange-200",
  },
  {
    value: "critical",
    label: "Critical",
    dotColor: "bg-red-500",
    activeBg: "bg-red-50",
    activeText: "text-red-700",
    activeBorder: "border-red-200",
  },
] as const;

const rootEl = ref<HTMLElement | null>(null);
const shadowRoot = computed(
  () => rootEl.value?.getRootNode() as ShadowRoot | null
);

const form = ref<ComposeForm>({
  title: "",
  summary: "",
  severity: "medium",
  projectId: "",
  visibility: "private",
});
const projects = ref<Project[]>([]);
const projectsLoading = ref(true);
const projectsLoadError = ref("");
const canSubmit = computed(() => form.value.title.trim().length > 0);

onMounted(async () => {
  try {
    const [list, auth] = await Promise.all([api.listProjects(), getAuth()]);
    projects.value = list;
    // Prefer the active project the user picked in the popup; fall back to the first.
    const preferred = auth?.defaultProjectId && list.some((p) => p.id === auth.defaultProjectId)
      ? auth.defaultProjectId
      : list[0]?.id;
    if (preferred) form.value.projectId = preferred;
  } catch (e) {
    // Surface the real reason so an empty list isn't indistinguishable from a network/auth failure.
    projectsLoadError.value = (e as Error).message || "Couldn't load projects.";
    console.warn("[DevProbe] listProjects failed:", e);
  } finally {
    projectsLoading.value = false;
  }
});

function onSubmit() {
  if (!canSubmit.value) return;
  emit("submit", { ...form.value, title: form.value.title.trim() });
}
</script>
