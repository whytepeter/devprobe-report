<!--
  PostComposeModal  (headless / media-agnostic)
  ──────────────────────────────────────────────
  Semi-fullscreen overlay rendered inside shadow DOM.

  Top    — ComposeHeading (shared, status + URL + actions)
  Bottom — two-panel split:
             Left  — #media slot  (ScreenshotPanel or RecordingPanel)
             Right — IssueComposePanel (form)

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
        style="width: min(95vw, 1300px); height: min(88vh, 760px)"
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
              :show-download="showDownload"
              :show-regenerate="showRegenerate"
              @download="emit('download')"
              @regenerate="emit('regenerate')"
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

        <!-- Body: media | form -->
        <div class="flex flex-1 min-h-0 border-t border-border">
          <!-- LEFT — media -->
          <div class="relative flex-1 min-w-0 overflow-hidden border-r border-border">
            <slot name="media"/>
          </div>

          <!-- RIGHT — compose -->
          <div class="flex w-[360px] shrink-0 flex-col">
            <IssueComposePanel
              :submitting="submitting"
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
import { Button, Icon }   from '@deveprobe/ui';
import IssueComposePanel  from './IssueComposePanel.vue';
import ComposeHeading     from './ComposeHeading.vue';
import type { ComposeForm } from './IssueComposePanel.vue';

export type { ComposeForm };

defineProps<{
  submitting?:        boolean;
  error?:             string;
  screen?:            'compose' | 'success';
  pageUrl?:           string;
  /** "Recording" | "Screenshot" — heading title */
  headingMode:        string;
  /** Only set for recordings */
  headingDurationMs?: number;
  /** Show "Generating ..." state on the regenerate button */
  generating?:        boolean;
  /** True once the AI has produced content at least once (label: Generate → Regenerate) */
  hasGenerated?:      boolean;
  /** Render the Download button in the heading */
  showDownload?:      boolean;
  /** Render the Regenerate button in the heading */
  showRegenerate?:    boolean;
}>();

const emit = defineEmits<{
  submit:     [form: ComposeForm];
  cancel:     [];
  download:   [];
  regenerate: [];
}>();
</script>
