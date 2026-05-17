<!--
  FormMessage — renders the active validation error (if any), or whatever
  message is passed via the default slot.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { useFieldError } from 'vee-validate';
import { useFormField, formItemIds } from './useFormField.js';

const field = useFormField();
const error = useFieldError(field.name);
const { formMessageId } = formItemIds(field.id);

const body = computed(() => error.value);
</script>

<template>
  <p
    v-if="body"
    :id="formMessageId"
    class="text-xs font-medium text-destructive"
  >
    {{ body }}
  </p>
</template>
