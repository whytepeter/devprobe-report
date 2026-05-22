<!--
  Button
  ──────
  Variant + size driven button (shadcn / CVA pattern).

  Loading prop:
    • Renders an inline spinner in place of leading content while truthy.
    • Auto-disables the button (so callers don't have to wire :disabled too).
    • Spinner colour inherits `currentColor` so it matches every variant.

  Default-slot content is still rendered while loading (next to the spinner)
  so the button preserves its width — typical pattern for "Saving…" labels.
-->
<script setup lang="ts">
import type { PrimitiveProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import type { ButtonVariants } from ".";
import { computed } from "vue";
import { Primitive } from "reka-ui";
import { cn } from "@ui/lib/utils";
import { buttonVariants } from ".";

interface Props extends PrimitiveProps {
  variant?:  ButtonVariants["variant"];
  size?:     ButtonVariants["size"];
  class?:    HTMLAttributes["class"];
  /** Show an inline spinner + disable interaction. */
  loading?:  boolean;
  /** Native disabled — independent of `loading`. */
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  as: "button",
});

// Loading implies disabled. Anything truthy on either prop disables.
const isDisabled = computed(() => props.loading || props.disabled);
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    :disabled="isDisabled || undefined"
    :aria-busy="loading || undefined"
    :data-loading="loading || undefined"
    :class="cn(buttonVariants({ variant, size }), props.class)"
  >
    <!--
      Spinner sized down a touch from the text so it doesn't dominate small
      buttons. `currentColor` so it matches every variant's foreground.
    -->
    <span
      v-if="loading"
      class="inline-block h-3 w-3 shrink-0 rounded-full border-[1.5px] border-current border-t-transparent animate-spin"
      aria-hidden="true"
    />
    <slot />
  </Primitive>
</template>
