<!--
  FormLabel — renders a <Label> bound to the form item id. Red when invalid.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { useFieldError } from 'vee-validate';
import { Label } from '../label/index.js';
import { useFormField, formItemIds } from './useFormField.js';

const field = useFormField();
const error = useFieldError(field.name);
const { formItemId } = formItemIds(field.id);

const classes = computed(() =>
  error.value ? 'text-destructive' : '',
);
</script>

<template>
  <Label :for="formItemId" :class="classes">
    <slot />
  </Label>
</template>
