/**
 * useTagsField
 * ────────────
 * Tag-input ergonomics extracted from IssueComposePanel so the form template
 * stays focused on layout. The composable owns the inline-edit lifecycle
 * (start / commit / cancel) and tag normalisation (trim, drop leading `#`,
 * lowercase, de-dupe).
 *
 * The caller provides the tags array as a Ref so this can be wired directly
 * to the form object (`form.tags`) without lifting state.
 */
import { nextTick, ref, type Ref } from 'vue';

export interface UseTagsField {
  /** Whether the inline tag input is currently visible. */
  adding:  Ref<boolean>;
  /** v-model for the tag input. */
  draft:   Ref<string>;
  /** Template ref for focusing the input. */
  inputEl: Ref<HTMLInputElement | null>;

  /** Show the input and focus it. */
  start:   () => Promise<void>;
  /** Normalise the draft, push it (if unique), then hide the input. */
  commit:  () => void;
  /** Hide the input without committing. */
  cancel:  () => void;
  /** Remove a tag by exact value. */
  remove:  (tag: string) => void;
}

export function useTagsField(tags: Ref<string[]>): UseTagsField {
  const adding  = ref(false);
  const draft   = ref('');
  const inputEl = ref<HTMLInputElement | null>(null);

  function normalise(raw: string): string {
    return raw.trim().replace(/^#/, '').toLowerCase();
  }

  async function start() {
    adding.value = true;
    draft.value  = '';
    await nextTick();
    inputEl.value?.focus();
  }

  function commit() {
    const t = normalise(draft.value);
    if (t && !tags.value.includes(t)) tags.value.push(t);
    adding.value = false;
    draft.value  = '';
  }

  function cancel() {
    adding.value = false;
    draft.value  = '';
  }

  function remove(tag: string) {
    tags.value = tags.value.filter((t) => t !== tag);
  }

  return { adding, draft, inputEl, start, commit, cancel, remove };
}
