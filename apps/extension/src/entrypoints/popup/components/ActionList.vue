<!-- Capture action list for popup -->
<template>
  <div class="px-3 py-2 space-y-0.5">
    <p class="px-3 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
      Capture
    </p>

    <ActionItem
      label="Screenshot"
      description="Capture the current tab"
      @click="$emit('screenshot')"
    >
      <template #icon>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"
             class="w-4 h-4">
          <rect x="3" y="6" width="18" height="14" rx="2"/>
          <circle cx="12" cy="13" r="3"/>
          <path d="M9 6 l1-2 h4 l1 2"/>
        </svg>
      </template>
    </ActionItem>

    <ActionItem
      label="Annotate"
      description="Pin issues on the page"
      badge="Soon"
      :disabled="true"
    >
      <template #icon>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"
             class="w-4 h-4">
          <path d="M12 2 C8 2 5 5 5 9 C5 14 12 22 12 22 C12 22 19 14 19 9 C19 5 16 2 12 2Z"/>
          <circle cx="12" cy="9" r="2.5"/>
        </svg>
      </template>
    </ActionItem>

    <ActionItem
      label="Record"
      description="Capture a full bug report"
      @click="$emit('record')"
    >
      <template #icon>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"
             class="w-4 h-4">
          <rect x="2" y="6" width="14" height="12" rx="2"/>
          <path d="M16 10 l6-3 v10 l-6-3"/>
        </svg>
      </template>
    </ActionItem>
  </div>
</template>

<script setup lang="ts">
import ActionItem from './ActionItem.vue';

defineEmits<{ screenshot: []; record: [] }>();
</script>
