<!--
  FormItem — vertical stack wrapper for a single field's label + control + message.
-->
<script setup lang="ts">
import { useFormField } from './useFormField.js';
useFormField(); // assert we're inside a FormField
</script>

<template>
  <div class="space-y-1.5">
    <slot />
  </div>
</template>
