<!--
  IssueDescription
  ────────────────
  Renders the issue's free-text summary. We preserve user line breaks via
  whitespace-pre-wrap so a "Steps to reproduce / Expected / Actual" template
  reads correctly without a markdown pipeline.
-->
<template>
  <section class="space-y-2">
    <h2 class="text-[13px] font-semibold text-foreground">Description</h2>

    <p
      v-if="summary"
      class="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap"
    >
      {{ summary }}
    </p>

    <p v-else class="text-xs text-muted-foreground italic">
      No description provided.
    </p>
  </section>
</template>

<script setup lang="ts">
defineProps<{ summary: string | null | undefined }>();
</script>
