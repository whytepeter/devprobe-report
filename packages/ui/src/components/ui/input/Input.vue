<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { useVModel } from "@vueuse/core";
import { cn } from "@ui/lib/utils";

const props = defineProps<{
  defaultValue?: string | number;
  modelValue?: string | number;
  class?: HTMLAttributes["class"];
}>();

const emits = defineEmits<{
  (e: "update:modelValue", payload: string | number): void;
}>();

const modelValue = useVModel(props, "modelValue", emits, {
  passive: true,
  defaultValue: props.defaultValue,
});
</script>

<template>
  <input
    v-model="modelValue"
    :class="
      cn(
        'flex h-11 w-full rounded-lg border border-input bg-card px-3 text-[13px] font-sans',
        'placeholder:text-muted-foreground',
        'transition-all duration-150 outline-none',
        'focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-secondary',
        'file:border-0 file:bg-transparent file:text-foreground file:text-sm file:font-medium',
        props.class
      )
    "
  />
</template>
