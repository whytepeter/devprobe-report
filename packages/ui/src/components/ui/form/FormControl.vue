<!--
  FormControl — assigns id + aria attributes to the wrapped control.
  Uses reka-ui's <Slot> primitive so the bound props end up on the actual
  input element rather than a wrapper div.
-->
<script setup lang="ts">
import { Slot } from 'reka-ui';
import { useFieldError } from 'vee-validate';
import { useFormField, formItemIds } from './useFormField.js';

const field = useFormField();
const error = useFieldError(field.name);
const { formItemId, formDescriptionId, formMessageId } = formItemIds(field.id);
</script>

<template>
  <Slot
    :id="formItemId"
    :aria-describedby="error ? `${formDescriptionId} ${formMessageId}` : formDescriptionId"
    :aria-invalid="!!error"
  >
    <slot />
  </Slot>
</template>
