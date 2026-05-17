<script setup lang="ts">
import { useFormField, formItemIds } from './useFormField.js';

const field = useFormField();
const { formDescriptionId } = formItemIds(field.id);
</script>

<template>
  <p :id="formDescriptionId" class="text-[11px] text-muted-foreground leading-snug">
    <slot />
  </p>
</template>
