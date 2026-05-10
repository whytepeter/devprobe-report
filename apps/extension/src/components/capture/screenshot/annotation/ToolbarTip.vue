<!--
  ToolbarTip
  ──────────
  Tiny hover tooltip used by AnnotationToolbar. Wraps a single button
  via the default slot and floats a label above on hover.
-->
<template>
  <div
    class="relative inline-flex items-center"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
  >
    <slot/>
    <Transition
      enter-active-class="transition-[opacity,transform] duration-100 ease-out"
      enter-from-class="opacity-0 translate-y-1"
      leave-active-class="transition-opacity duration-75 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="visible"
        class="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2
               whitespace-nowrap rounded-md bg-[#1f1f1f] px-2 py-1
               text-[11px] font-medium text-white shadow-[0_4px_14px_rgba(0,0,0,0.25)] z-30"
      >
        {{ label }}
        <span v-if="shortcut" class="ml-1 text-[10px] opacity-60">{{ shortcut }}</span>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue';

defineProps<{ label: string; shortcut?: string }>();

const visible = ref(false);
let timer: ReturnType<typeof setTimeout> | null = null;

function onEnter() {
  if (timer) clearTimeout(timer);
  // Small delay so the tooltip doesn't flash for fly-bys
  timer = setTimeout(() => { visible.value = true; }, 180);
}
function onLeave() {
  if (timer) clearTimeout(timer);
  timer = null;
  visible.value = false;
}

onUnmounted(() => { if (timer) clearTimeout(timer); });
</script>
