<!--
  FormField — wraps vee-validate's <Field> while exposing a small context
  (id + name) to descendants so FormLabel / FormControl / FormMessage can
  resolve aria attributes and look up errors without prop drilling.

  Usage:
    <FormField name="email" v-slot="{ componentField, errorMessage }">
      <FormItem>
        <FormLabel>Email</FormLabel>
        <FormControl>
          <Input v-bind="componentField" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
-->
<script setup lang="ts">
import { Field } from 'vee-validate';
import { provideFormField } from './useFormField.js';

const props = defineProps<{ name: string }>();

// vee-validate's <Field> doesn't accept a fixed id. We synthesise one per
// FormField instance so all aria links inside the FormItem line up.
const id = `form-field-${props.name}-${Math.random().toString(36).slice(2, 8)}`;

provideFormField({ id, name: props.name });
</script>

<template>
  <Field :name="name" v-slot="slotProps">
    <slot v-bind="slotProps" />
  </Field>
</template>
