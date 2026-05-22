<!--
  PostComposeModal  (headless / media-agnostic)
  ──────────────────────────────────────────────
  Semi-fullscreen overlay rendered inside shadow DOM.

  Top    — ComposeHeading (shared, status + URL + actions)
  Bottom — two-panel split:
             Left  — #media slot  (ScreenshotPanel or RecordingPanel)
             Right — IssueComposePanel (form)

  Owns the cross-capture concerns so ScreenshotCapture / RecordingCapture stay
  DRY:
    • Download button → uses the `download` prop (mode-specific URL + filename)
    • Regenerate (AI) → calls `aiGenerate` prop, writes the result into the
                        IssueComposePanel form via its exposed applyFields().

  Backdrop click does NOT close. Close button (X) sits in the heading row.
-->
<template>
  <Transition
    enter-active-class="transition-all duration-200 ease-out"
    enter-from-class="opacity-0 scale-[0.97] translate-y-2"
    leave-active-class="transition-all duration-150 ease-in"
    leave-to-class="opacity-0 scale-[0.97] translate-y-2"
  >
    <div
      class="fixed inset-0 z-[2147483646] flex items-center justify-center p-4 sm:p-6 pointer-events-auto font-sans"
      style="background: rgba(0,0,0,0.55); backdrop-filter: blur(14px)"
      role="dialog"
      aria-modal="true"
      @click.self.stop
      @mousedown.self.stop
    >
      <div
        class="relative flex w-full flex-col overflow-hidden rounded-2xl bg-card border border-border
               shadow-[0_40px_100px_rgba(0,0,0,0.30),0_0_0_1px_rgba(0,0,0,0.06)]"
        style="width: min(95vw, 1300px); height: min(92dvh, 860px)"
        @click.stop
        @mousedown.stop
      >
        <!-- Top heading row: ComposeHeading + Close -->
        <div class="relative flex shrink-0">
          <div class="flex-1 min-w-0">
            <ComposeHeading
              :mode="headingMode"
              :duration-ms="headingDurationMs"
              :page-url="pageUrl"
              :generating="generating"
              :has-generated="hasGenerated"
              :show-download="!!download"
              :show-regenerate="!!aiGenerate"
              @download="onDownload"
              @regenerate="onRegenerate"
            />
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Close"
            :disabled="submitting"
            class="mr-2 my-1 z-30 disabled:cursor-not-allowed"
            @click="!submitting && emit('cancel')"
          >
            <Icon name="x" :size="14" :stroke-width="2"/>
          </Button>
        </div>

        <!-- Body: media | form
             Mobile: stacks vertically, the OUTER body scrolls so media + form
             are both naturally sized and the whole modal feels like one
             continuous page. At ≥ md, the two-column layout takes over with
             internal scroll on the form panel only. -->
        <div class="flex flex-col md:flex-row flex-1 min-h-0 overflow-y-auto md:overflow-hidden border-t border-border">
          <!-- LEFT (top on mobile) — media: natural height on mobile (uses its own
               aspect-ratio), flex-fills on desktop. -->
          <div class="relative min-w-0 shrink-0 overflow-hidden md:shrink md:flex-1 md:min-h-0 md:border-r border-border">
            <slot name="media"/>
          </div>

          <!-- RIGHT (bottom on mobile) — compose: natural height on mobile
               (no internal scroll), fixed 360px panel with internal scroll on desktop. -->
          <div class="flex w-full md:w-[360px] shrink-0 md:min-h-0 flex-col border-t md:border-t-0 border-border">
            <IssueComposePanel
              ref="panelRef"
              :submitting="submitting"
              :submit-label="submitLabel"
              :error="error"
              :screen="screen"
              @submit="emit('submit', $event)"
              @cancel="emit('cancel')"
            >
              <template #success><slot name="success"/></template>
            </IssueComposePanel>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Button, Icon }   from '@deveprobe/ui';
import IssueComposePanel  from './IssueComposePanel.vue';
import ComposeHeading     from './ComposeHeading.vue';
import type { ComposeForm } from './IssueComposePanel.vue';

export type { ComposeForm };

/** Result returned by an AI generation call. Any subset of fields is fine. */
export interface AiGenerated {
  title?:    string;
  /** Reproduction steps — becomes the issue description. */
  summary?:  string;
  severity?: string;
  tags?:     string[];
}

const props = defineProps<{
  submitting?:        boolean;
  /** Forwarded to IssueComposePanel submit button label while submitting. */
  submitLabel?:       string;
  error?:             string;
  screen?:            'compose' | 'success';
  pageUrl?:           string;
  /** "Recording" | "Screenshot" — heading title */
  headingMode:        string;
  /** Only set for recordings */
  headingDurationMs?: number;

  /**
   * Download config. Provide it to render the Download button. `getHref`
   * may be sync or async (e.g. ScreenshotPanel.exportPng() returns a fresh
   * annotated data URL each time).
   */
  download?: {
    getHref:  () => string | Promise<string>;
    filename: string;
  };

  /**
   * AI generate fn. Provide it to render the Regenerate button. Returns the
   * fields to apply (title / repro steps as `summary` / tags). The Modal
   * writes them straight into IssueComposePanel.
   */
  aiGenerate?: () => Promise<AiGenerated>;
}>();

const emit = defineEmits<{
  submit:     [form: ComposeForm];
  cancel:     [];
}>();

const panelRef     = ref<InstanceType<typeof IssueComposePanel> | null>(null);
const generating   = ref(false);
const hasGenerated = ref(false);

async function onDownload() {
  if (!props.download) return;
  try {
    const href = await Promise.resolve(props.download.getHref());
    const a    = document.createElement('a');
    a.href     = href;
    a.download = props.download.filename;
    document.body.appendChild(a);    // Firefox requires it to be in the DOM
    a.click();
    a.remove();
  } catch (e) {
    console.warn('[DevProbe] download failed:', (e as Error).message);
  }
}

async function onRegenerate() {
  if (!props.aiGenerate || generating.value) return;
  generating.value = true;
  try {
    const result = await props.aiGenerate();
    panelRef.value?.applyFields(result);
    hasGenerated.value = true;
  } catch (e) {
    console.warn('[DevProbe] AI generate failed:', (e as Error).message);
  } finally {
    generating.value = false;
  }
}
</script>
