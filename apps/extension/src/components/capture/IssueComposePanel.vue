<!--
  IssueComposePanel
  ─────────────────
  Right-side form panel for PostComposeModal (shadow DOM).

  Sections (top → bottom):
  - TITLE       — single-line input
  - DESCRIPTION — multi-line, fills available space
  - SEVERITY    — pill group; selected = dark filled
  - TAGS        — chips + dashed "add" button
  - Footer      — visibility select + "Create issue & copy link" primary
-->
<template>
  <div ref="rootEl" class="flex h-full flex-col bg-card">
    <!-- Body -->
    <div class="relative flex-1 min-h-0 overflow-y-auto">
      <slot v-if="screen === 'success'" name="success" />

      <form
        v-else
        class="flex h-full flex-col"
        :class="{ 'pointer-events-none opacity-70': submitting }"
        @submit.prevent="onSubmit"
      >
        <!-- TITLE -->
        <div class="shrink-0 px-5 pt-4 pb-2 space-y-1.5">
          <p class="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground/80">Title</p>
          <input
            v-model="form.title"
            :disabled="submitting"
            class="block w-full bg-transparent border-0 outline-none p-0 appearance-none shadow-none text-[17px] font-semibold leading-snug tracking-[-0.01em] text-foreground placeholder:text-muted-foreground/50 focus:ring-0 font-sans disabled:cursor-not-allowed"
            placeholder="Brief title"
            maxlength="180"
            autofocus
          />
        </div>

        <!-- DESCRIPTION -->
        <div class="flex flex-1 flex-col min-h-0 px-5 pt-3 pb-2 space-y-1.5">
          <p class="shrink-0 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground/80">Description</p>
          <textarea
            v-model="form.summary"
            :disabled="submitting"
            class="block w-full flex-1 min-h-0 bg-transparent border-0 outline-none p-0 appearance-none shadow-none resize-none leading-[1.6] text-[13px] text-foreground/80 placeholder:text-muted-foreground/50 focus:ring-0 font-sans disabled:cursor-not-allowed"
            placeholder="What happened…"
          />
        </div>

        <!-- Divider -->
        <div class="mx-5 h-px bg-border shrink-0" />

        <!-- SEVERITY -->
        <div class="shrink-0 px-5 pt-3.5 pb-2 space-y-2">
          <p class="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground/80">Severity</p>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="s in SEVERITIES"
              :key="s.value"
              type="button"
              :disabled="submitting"
              class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors focus-visible:outline-none disabled:cursor-not-allowed"
              :class="form.severity === s.value
                ? 'border-foreground bg-foreground text-background'
                : 'border-border bg-background text-foreground/85 hover:bg-muted'"
              @click="form.severity = s.value"
            >
              <span class="h-1.5 w-1.5 shrink-0 rounded-full" :class="s.dotColor" />
              {{ s.label }}
            </button>
          </div>
        </div>

        <!-- TAGS -->
        <div class="shrink-0 px-5 pt-3.5 pb-4 space-y-2">
          <p class="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground/80">Tags</p>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="tag in form.tags"
              :key="tag"
              class="inline-flex items-center gap-1 rounded-md bg-primary/15 px-2 py-1 font-mono text-[11px] text-primary"
            >
              # {{ tag }}
              <button
                type="button"
                class="text-primary/50 transition-colors hover:text-primary"
                @click="removeTag(tag)"
              >
                <Icon name="x" :size="10" :stroke-width="2.5" />
              </button>
            </span>

            <input
              v-if="addingTag"
              ref="tagInputEl"
              v-model="newTag"
              :disabled="submitting"
              class="w-20 rounded-md border border-primary/30 bg-background px-2 py-1 font-mono text-[11px] text-foreground outline-none focus:border-primary"
              placeholder="tag"
              @keydown.enter.prevent="commitTag"
              @keydown.escape="cancelAddTag"
              @blur="commitTag"
            />
            <button
              v-else
              type="button"
              :disabled="submitting"
              class="inline-flex items-center gap-1 rounded-md border border-dashed border-border bg-background px-2 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground disabled:cursor-not-allowed"
              @click="startAddTag"
            >
              <Icon name="plus" :size="10" :stroke-width="2.5" />
              add
            </button>
          </div>
        </div>

        <!-- Error -->
        <div
          v-if="error"
          class="mx-5 mb-3 flex shrink-0 items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive"
        >
          <Icon name="alert-circle" :size="12" class="mt-px shrink-0" />
          {{ error }}
        </div>
      </form>
    </div>

    <!-- Footer -->
    <div v-if="screen !== 'success'" class="shrink-0 border-t border-border">
      <!-- Visibility -->
      <div class="px-4 pt-3 pb-2">
        <Select v-model="form.visibility" :disabled="submitting">
          <SelectTrigger :disabled="submitting">
            <Icon name="link" :size="13" class="shrink-0 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent :to="portalTarget ?? undefined">
            <SelectItem value="public">Anyone with the link</SelectItem>
            <SelectItem value="private">Only people in this workspace</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <!-- Submit -->
      <div class="px-4 pb-4">
        <Button
          variant="default"
          class="w-full gap-1.5"
          :disabled="!canSubmit || submitting"
          @click="onSubmit"
        >
          <span
            v-if="submitting"
            class="h-3 w-3 rounded-full border-[1.5px] border-primary-foreground border-t-transparent animate-spin"
          />
          <Icon
            v-else
            name="check"
            :size="13"
            :stroke-width="2.5"
            class="shrink-0"
          />
          {{ submitting ? "Creating…" : "Create issue & copy link" }}
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from "vue";
import {
  Button,
  Icon,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@deveprobe/ui";

export interface ComposeForm {
  title:      string;
  summary:    string;
  severity:   string;
  visibility: string;
  tags:       string[];
}

defineProps<{
  submitting?: boolean;
  error?:      string;
  screen?:     "compose" | "success";
}>();

const emit = defineEmits<{
  submit: [form: ComposeForm];
  cancel: [];
}>();

// Dot colours match the design (gray / teal / amber / red).
const SEVERITIES = [
  { value: "low",      label: "Low",      dotColor: "bg-neutral-400" },
  { value: "medium",   label: "Medium",   dotColor: "bg-teal-500"   },
  { value: "high",     label: "High",     dotColor: "bg-amber-400"  },
  { value: "critical", label: "Critical", dotColor: "bg-red-500"    },
] as const;

const rootEl = ref<HTMLElement | null>(null);

// Portal Select content into the closest themed ancestor so the dropdown
// inherits the `.dark` / `.light` CSS variables. Falling back to shadowRoot
// would break theming because the portal would escape the themed container.
const portalTarget = computed<HTMLElement | ShadowRoot | null>(() => {
  let el: Element | null = rootEl.value;
  while (el) {
    if (el.classList.contains("dark") || el.classList.contains("light")) {
      return el as HTMLElement;
    }
    el = el.parentElement;
  }
  return (rootEl.value?.getRootNode() as ShadowRoot) ?? null;
});

const form = ref<ComposeForm>({
  title:      "",
  summary:    "",
  severity:   "medium",
  visibility: "private",
  tags:       [],
});
const canSubmit = computed(() => form.value.title.trim().length > 0);

// ── Tag management ─────────────────────────────────────────────────────────
const addingTag  = ref(false);
const newTag     = ref("");
const tagInputEl = ref<HTMLInputElement | null>(null);

async function startAddTag() {
  addingTag.value = true;
  newTag.value    = "";
  await nextTick();
  tagInputEl.value?.focus();
}

function commitTag() {
  const t = newTag.value.trim().replace(/^#/, "").toLowerCase();
  if (t && !form.value.tags.includes(t)) {
    form.value.tags.push(t);
  }
  addingTag.value = false;
  newTag.value    = "";
}

function cancelAddTag() {
  addingTag.value = false;
  newTag.value    = "";
}

function removeTag(tag: string) {
  form.value.tags = form.value.tags.filter((t) => t !== tag);
}

// ── Submit ─────────────────────────────────────────────────────────────────
function onSubmit() {
  if (!canSubmit.value) return;
  emit("submit", { ...form.value, title: form.value.title.trim() });
}
</script>
