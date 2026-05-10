<!-- Top bar: DevProbe wordmark + connection status + theme toggle -->
<template>
  <div class="flex items-center justify-between px-4 py-3 border-b border-border">

    <!-- Logo -->
    <div class="flex items-center gap-2">
      <span class="flex h-[22px] w-[22px] items-center justify-center rounded-[6px] bg-primary shrink-0">
        <Icon name="hexagon" :size="12" color="#fff" :stroke-width="2.5"/>
      </span>
      <span class="text-[13px] font-semibold tracking-tight text-foreground">DevProbe</span>
    </div>

    <!-- Right side -->
    <div class="flex items-center gap-2">
      <span v-if="connected" class="flex items-center gap-1.5 text-[11px] font-medium text-emerald-500">
        <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"/>
        Connected
      </span>
      <a
        v-else
        :href="connectUrl"
        target="_blank"
        class="text-[11px] text-primary font-medium underline underline-offset-2 hover:opacity-80 transition-opacity"
      >
        Connect workspace
      </a>

      <!-- Theme toggle -->
      <Button
        variant="ghost"
        size="icon-sm"
        :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
        @click="onToggle"
      >
        <Icon :name="isDark ? 'sun' : 'moon'" :size="13" :stroke-width="1.75"/>
      </Button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import Icon from '../../../components/base/Icon.vue';
import { Button } from '@deveprobe/ui';
import { getTheme, toggleTheme, applyThemeClass } from '../../../lib/theme.js';

defineProps<{
  connected:  boolean;
  connectUrl: string;
}>();

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
