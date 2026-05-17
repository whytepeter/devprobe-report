<!--
  AnnotationToolbar
  ─────────────────
  Floating pill toolbar below the screenshot.

  Layout:
    [color | select  pen  rect  circle  arrow  text  blur | undo  redo]

  Each button has a custom hover tooltip (above the toolbar) showing the
  tool name + keyboard shortcut.
-->
<template>
  <div class="relative flex items-center" @click.stop>

    <!-- ── Color popover ──────────────────────────────────────────────── -->
    <Transition
      enter-active-class="transition-[opacity,transform] duration-150 ease-out"
      enter-from-class="opacity-0 translate-y-2 scale-95"
      leave-active-class="transition-[opacity,transform] duration-100 ease-in"
      leave-to-class="opacity-0 translate-y-2 scale-95"
    >
      <div
        v-if="colorOpen"
        class="absolute bottom-[calc(100%+10px)] left-0 origin-bottom-left z-20
               flex items-center gap-1.5 rounded-2xl
               border border-black/[0.08]
               bg-white/95 px-3 py-2.5
               shadow-[0_8px_28px_rgba(0,0,0,0.15)]
               backdrop-blur-md"
      >
        <button
          v-for="c in PRESETS"
          :key="c"
          :title="c"
          :style="{ background: c }"
          :class="[
            'h-[22px] w-[22px] flex-shrink-0 rounded-full cursor-pointer border-0',
            'transition-transform duration-100 hover:scale-110',
            c === '#ffffff' ? 'ring-1 ring-black/15' : '',
            color === c ? 'scale-110 ring-2 ring-offset-[2px] ring-[#7c3aed]' : '',
          ]"
          @click="selectColor(c)"
        />
        <button
          title="Custom color"
          class="relative flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center
                 rounded-full border-2 border-dashed border-[#cbd5e1]
                 bg-transparent cursor-pointer hover:scale-110 transition-transform duration-100"
          @click="colorInput?.click()"
        >
          <Icon name="plus" :size="11" :stroke-width="2.5" class="text-[#94a3b8]"/>
        </button>
        <input
          ref="colorInput"
          type="color"
          :value="color"
          class="absolute h-0 w-0 opacity-0 pointer-events-none"
          @input="onColorInput"
        />
      </div>
    </Transition>

    <!-- ── Main toolbar pill ──────────────────────────────────────────── -->
    <div
      class="flex items-center gap-px rounded-2xl
             border border-black/[0.08]
             bg-white/95 px-2 py-[7px]
             shadow-[0_8px_28px_rgba(0,0,0,0.15)]
             backdrop-blur-md select-none"
    >
      <!-- Color dot -->
      <Tip label="Color">
        <button
          :class="[
            'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border-0 p-0 cursor-pointer',
            'transition-colors duration-100',
            colorOpen ? 'bg-[#ede9fe]' : 'bg-transparent hover:bg-black/5',
          ]"
          @click="colorOpen = !colorOpen"
        >
          <span
            :class="['h-[18px] w-[18px] rounded-full transition-shadow duration-100',
              colorOpen ? 'ring-2 ring-offset-2 ring-[#7c3aed]' : 'ring-1 ring-black/20',
            ]"
            :style="{ background: color }"
          />
        </button>
      </Tip>

      <span class="mx-1.5 h-[18px] w-px flex-shrink-0 bg-black/10"/>

      <!-- Tool buttons -->
      <Tip v-for="t in TOOLS" :key="t.id" :label="t.label" :shortcut="t.shortcut">
        <button
          :class="[
            'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border-0 p-0',
            'cursor-pointer transition-colors duration-100',
            tool === t.id
              ? 'bg-[#ede9fe] text-[#6d28d9]'
              : 'bg-transparent text-[#3a3a3a] hover:bg-black/5 hover:text-black',
          ]"
          @click="emit('update:tool', t.id)"
        >
          <Icon :name="t.icon" :size="16" :stroke-width="tool === t.id ? 2.25 : 1.75"/>
        </button>
      </Tip>

      <span class="mx-1.5 h-[18px] w-px flex-shrink-0 bg-black/10"/>

      <Tip label="Undo" shortcut="⌘Z">
        <button
          :disabled="!canUndo"
          :class="[
            'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border-0 p-0',
            'transition-colors duration-100',
            canUndo
              ? 'cursor-pointer bg-transparent text-[#3a3a3a] hover:bg-black/5 hover:text-black'
              : 'cursor-not-allowed opacity-25 bg-transparent text-[#3a3a3a]',
          ]"
          @click="emit('undo')"
        >
          <Icon name="undo-2" :size="16" :stroke-width="1.75"/>
        </button>
      </Tip>

      <Tip label="Redo" shortcut="⌘⇧Z">
        <button
          :disabled="!canRedo"
          :class="[
            'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border-0 p-0',
            'transition-colors duration-100',
            canRedo
              ? 'cursor-pointer bg-transparent text-[#3a3a3a] hover:bg-black/5 hover:text-black'
              : 'cursor-not-allowed opacity-25 bg-transparent text-[#3a3a3a]',
          ]"
          @click="emit('redo')"
        >
          <Icon name="redo-2" :size="16" :stroke-width="1.75"/>
        </button>
      </Tip>

      <!-- Delete (only when a shape is selected with the grab tool) -->
      <template v-if="hasSelection">
        <span class="mx-1.5 h-[18px] w-px flex-shrink-0 bg-black/10"/>
        <Tip label="Delete" shortcut="⌫">
          <button
            class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border-0 p-0
                   cursor-pointer bg-transparent text-[#ef4444]
                   transition-colors duration-100 hover:bg-red-50 hover:text-[#dc2626]"
            @click="emit('delete')"
          >
            <Icon name="trash-2" :size="16" :stroke-width="1.9"/>
          </button>
        </Tip>
      </template>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { Icon } from '@deveprobe/ui';
import Tip from './ToolbarTip.vue';
import type { DrawTool } from './types.js';

defineProps<{
  tool:         DrawTool;
  color:        string;
  canUndo:      boolean;
  canRedo:      boolean;
  hasSelection: boolean;
}>();

const emit = defineEmits<{
  'update:tool':  [t: DrawTool];
  'update:color': [c: string];
  undo:   [];
  redo:   [];
  delete: [];
}>();

// ── Color picker ──────────────────────────────────────────────────────────────
const colorOpen  = ref(false);
const colorInput = ref<HTMLInputElement | null>(null);

const PRESETS = ['#7c3aed', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#000000', '#ffffff'];

function selectColor(c: string) {
  emit('update:color', c);
  colorOpen.value = false;
}
function onColorInput(e: Event) {
  emit('update:color', (e.target as HTMLInputElement).value);
  colorOpen.value = false;
}

function onDocClick() { colorOpen.value = false; }
onMounted(()   => document.addEventListener('click', onDocClick));
onUnmounted(() => document.removeEventListener('click', onDocClick));

// ── Tools — mapped to lucide icon names ───────────────────────────────────────
const TOOLS: { id: DrawTool; label: string; icon: string; shortcut?: string }[] = [
  { id: 'grab',   label: 'Move',      icon: 'hand'            },
  { id: 'pen',    label: 'Pen',       icon: 'pencil'          },
  { id: 'rect',   label: 'Rectangle', icon: 'square'          },
  { id: 'circle', label: 'Ellipse',   icon: 'circle'          },
  { id: 'arrow',  label: 'Arrow',     icon: 'arrow-up-right'  },
  { id: 'text',   label: 'Text',      icon: 'type'            },
  { id: 'blur',   label: 'Blur',      icon: 'eye-off'         },
];
</script>
