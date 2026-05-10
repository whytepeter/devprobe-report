<template>
  <span :class="cls">{{ label }}</span>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Severity } from "@deveprobe/shared";

const props = defineProps<{ severity: Severity | null | undefined }>();

const map: Record<string, { label: string; cls: string }> = {
  critical: { label: "Critical", cls: "chip bg-red-500/10 text-red-400" },
  high:     { label: "High",     cls: "chip bg-orange-500/10 text-orange-400" },
  medium:   { label: "Medium",   cls: "chip bg-amber-500/10 text-amber-400" },
  low:      { label: "Low",      cls: "chip bg-neutral-500/10 text-neutral-400" },
};

const resolved = computed(() => map[props.severity ?? ""] ?? { label: "—", cls: "chip text-[var(--text-muted)]" });
const cls   = computed(() => resolved.value.cls);
const label = computed(() => resolved.value.label);
</script>
