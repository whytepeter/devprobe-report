<!--
  IssueDetailsCardField
  ─────────────────────
  Label + slot row used by IssueDetailsCard. Single responsibility: render a
  small uppercase label above the slot content with consistent spacing.

  Kept separate so the parent stays readable and the spacing/typography lives
  in one place.
-->
<template>
  <div class="min-w-0 space-y-1.5">
    <p class="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
      {{ label }}
    </p>
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{ label: string }>();
</script>
