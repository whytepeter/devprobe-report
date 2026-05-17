<!-- Top bar: brand + account menu + theme toggle -->
<template>
  <div class="flex items-center justify-between px-4 py-2.5 border-b border-border">
    <!-- Brand -->
    <div class="flex items-center gap-2">
      <span class="flex h-[22px] w-[22px] items-center justify-center rounded-[6px] bg-primary shrink-0">
        <Icon name="hexagon" :size="12" color="#fff" :stroke-width="2.5" />
      </span>
      <span class="text-[13px] font-semibold tracking-tight text-foreground">DevProbe</span>
    </div>

    <!-- Right cluster — account dropdown + theme toggle -->
    <div class="flex items-center gap-1">
      <slot name="menu" />
      <Button
        variant="ghost"
        size="icon-sm"
        :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
        @click="onToggle"
      >
        <Icon :name="isDark ? 'sun' : 'moon'" :size="13" :stroke-width="1.75" />
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Button, Icon } from '@deveprobe/ui';
import { getTheme, toggleTheme, applyThemeClass } from '../../../lib/theme.js';

const isDark = ref(false);

onMounted(async () => {
  const theme = await getTheme();
  isDark.value = theme === 'dark';
});

async function onToggle() {
  const next = await toggleTheme();
  isDark.value = next === 'dark';
  applyThemeClass(document.documentElement, next);
}
</script>
