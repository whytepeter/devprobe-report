<template>
  <div class="space-y-3">
    <p class="text-sm text-muted-foreground">Sign in to your workspace to continue.</p>
    <Button class="w-full" as-child>
      <RouterLink :to="`/login?redirect=${encodeURIComponent(returnPath)}`">Sign in</RouterLink>
    </Button>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
import { Button } from "@deveprobe/ui";

defineProps<{ returnPath: string }>();
</script>
