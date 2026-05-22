<!--
  IssueTitleBlock
  ───────────────
  Editable title + description. Click-to-edit affordance kept lightweight —
  the heading and paragraph use contenteditable so the layout doesn't jump
  when entering edit mode.

  Emits `update:title` / `update:summary` on blur if the value changed; the
  parent owns persistence (PATCH /issues/:id is pending API work).
-->
<template>
  <header class="space-y-3">
    <h1
      ref="titleEl"
      contenteditable="plaintext-only"
      class="text-3xl md:text-4xl font-semibold leading-[1.15] tracking-tight text-foreground outline-none focus:bg-accent/30 focus:rounded-md focus:px-2 focus:-mx-2 transition-[background-color] duration-150"
      spellcheck="false"
      @blur="onTitleBlur"
      @keydown.enter.prevent="($event.target as HTMLElement).blur()"
    >{{ title }}</h1>

    <p
      ref="summaryEl"
      contenteditable="plaintext-only"
      :data-empty="!summary || undefined"
      class="text-[15px] leading-[1.7] text-foreground/80 whitespace-pre-wrap outline-none focus:bg-accent/30 focus:rounded-md focus:px-2 focus:-mx-2 transition-[background-color] duration-150
             data-[empty]:text-muted-foreground/60 data-[empty]:italic"
      spellcheck="false"
      @blur="onSummaryBlur"
    >{{ summary || placeholderSummary }}</p>
  </header>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";

const props = defineProps<{
  title:   string;
  summary: string | null | undefined;
}>();

const emit = defineEmits<{
  "update:title":   [value: string];
  "update:summary": [value: string];
}>();

const placeholderSummary = "Add a description…";

const titleEl   = ref<HTMLHeadingElement | null>(null);
const summaryEl = ref<HTMLParagraphElement | null>(null);

// Keep DOM in sync if props change from the outside (e.g. websocket update).
// We only assign when the value actually changed to avoid clobbering an
// active edit caret.
watch(() => props.title, (v) => {
  if (titleEl.value && titleEl.value.textContent !== v) titleEl.value.textContent = v;
});
watch(() => props.summary, (v) => {
  if (summaryEl.value && summaryEl.value.textContent !== (v ?? placeholderSummary)) {
    summaryEl.value.textContent = v ?? placeholderSummary;
  }
});

function onTitleBlur(e: FocusEvent) {
  const next = ((e.target as HTMLElement).textContent ?? "").trim();
  if (!next) {
    // Refuse empty title — restore previous value.
    if (titleEl.value) titleEl.value.textContent = props.title;
    return;
  }
  if (next !== props.title) emit("update:title", next);
}

function onSummaryBlur(e: FocusEvent) {
  const raw = ((e.target as HTMLElement).textContent ?? "").trim();
  // Restore the visual placeholder on empty; only emit if value actually changed.
  if (!raw) {
    if (summaryEl.value) summaryEl.value.textContent = placeholderSummary;
    if (props.summary) emit("update:summary", "");
    return;
  }
  if (raw !== props.summary) emit("update:summary", raw);
}
</script>
