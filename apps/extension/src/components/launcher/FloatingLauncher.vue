<!--
  FloatingLauncher — floating action button + compact command menu.
  Injected into every page via content script (shadow DOM).
-->
<template>
  <div class="pointer-events-auto">
    <!-- FAB
         IMPORTANT: do NOT use `var(--accent)` / `var(--border)` directly —
         those tokens are raw HSL components meant for `hsl(var(--token))`
         (shadcn pattern). Use the hex variants. -->
    <button
      type="button"
      :aria-label="menuOpen ? 'Close DevProbe' : 'Open DevProbe'"
      :style="fabStyle"
      class="fixed bottom-5 right-5 z-[2147483647]
             flex h-11 w-11 items-center justify-center rounded-full
             border cursor-pointer transition-[background-color,box-shadow,transform,border-color] duration-150
             focus-visible:outline-none active:scale-[0.95]"
      @click.stop="toggleMenu"
    >
      <Transition
        enter-active-class="transition-[opacity,transform] duration-100"
        enter-from-class="opacity-0 scale-75"
        leave-active-class="transition-[opacity,transform] duration-100"
        leave-to-class="opacity-0 scale-75"
        mode="out-in"
      >
        <Icon v-if="menuOpen" key="close" name="x"       :size="16" :stroke-width="2.5"/>
        <Icon v-else          key="open"  name="hexagon" :size="17" :stroke-width="1.75"/>
      </Transition>
    </button>

    <!-- Command menu -->
    <Transition
      enter-active-class="transition-[opacity,transform] duration-150 ease-out"
      enter-from-class="opacity-0 translate-y-2 scale-[0.96]"
      leave-active-class="transition-[opacity,transform] duration-100 ease-in"
      leave-to-class="opacity-0 translate-y-2 scale-[0.96]"
    >
      <div
        v-if="menuOpen"
        @click.stop
        style="pointer-events: auto;"
        class="fixed bottom-[72px] right-5 z-[2147483647] w-[248px] origin-bottom-right
               rounded-2xl border border-[rgba(0,0,0,0.06)] bg-[var(--bg-elevated)] p-1.5
               shadow-[0_16px_48px_rgba(0,0,0,0.14),0_2px_8px_rgba(0,0,0,0.08)]"
      >
        <!-- Disconnected: connect prompt -->
        <ConnectPrompt v-if="!auth" />

        <!-- Connected: capture actions -->
        <template v-else>
          <p class="px-2.5 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
            Capture
          </p>

          <LauncherItem
            icon="screenshot"
            label="Screenshot"
            description="Capture this tab"
            @click="onScreenshot"
          />
          <LauncherItem
            icon="annotate"
            label="Annotate"
            description="Pin issues on the page"
            :disabled="true"
            badge="Soon"
          />
          <LauncherItem
            icon="record"
            label="Record"
            description="Capture a full bug report"
            @click="onRecord"
          />

          <!-- Footer -->
          <div class="mt-1.5 border-t border-[rgba(0,0,0,0.06)] pt-1.5 px-2.5 pb-1">
            <p class="text-[10px] text-[var(--text-muted)]">
              DevProbe · <span class="text-[var(--accent)] font-medium">v0.1</span>
            </p>
          </div>
        </template>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { Icon } from '@deveprobe/ui';
import LauncherItem  from './LauncherItem.vue';
import ConnectPrompt from './ConnectPrompt.vue';
import { getAuth, onAuthChange, type StoredAuth } from '../../lib/auth.js';

const menuOpen = ref(false);
const auth     = ref<StoredAuth | null>(null);

// FAB styling — kept in JS so we can compose the two states from the theme
// tokens without fighting Tailwind's arbitrary-value parser.
const fabStyle = computed<Record<string, string>>(() => {
  if (menuOpen.value) {
    return {
      backgroundColor: 'var(--accent-hex)',
      color:           '#fff',
      borderColor:     'transparent',
      boxShadow:       '0 4px 16px rgba(124,58,237,0.28)',
    };
  }
  return {
    backgroundColor: 'var(--bg-elevated)',
    color:           'var(--text-primary)',
    borderColor:     'rgba(0,0,0,0.06)',
    boxShadow:       '0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.08)',
  };
});

function toggleMenu() { menuOpen.value = !menuOpen.value; }
function closeMenu()  { menuOpen.value = false; }

function onScreenshot() {
  closeMenu();
  window.dispatchEvent(new CustomEvent('dp:start-region-select'));
}

function onRecord() {
  closeMenu();
  window.dispatchEvent(new CustomEvent('dp:start-recording'));
}

function onDocClick() { closeMenu(); }

let unsubscribeAuth: (() => void) | null = null;

onMounted(async () => {
  document.addEventListener('click', onDocClick);
  auth.value = await getAuth();
  unsubscribeAuth = onAuthChange((next) => { auth.value = next; });
});
onUnmounted(() => {
  document.removeEventListener('click', onDocClick);
  unsubscribeAuth?.();
});
</script>
