<template>
  <span :class="cls">{{ label }}</span>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { IssueStatus } from "@deveprobe/shared";

const props = defineProps<{ status: IssueStatus }>();

const map: Record<string, { label: string; cls: string }> = {
  draft:                 { label: "Draft",          cls: "chip bg-[var(--bg-subtle)] text-[var(--text-muted)]" },
  open:                  { label: "Open",           cls: "chip bg-violet-500/10 text-violet-400" },
  triaged:               { label: "Triaged",        cls: "chip bg-violet-500/10 text-violet-400" },
  in_progress:           { label: "In Progress",    cls: "chip bg-cyan-500/10 text-cyan-400" },
  resolved:              { label: "Resolved",       cls: "chip bg-green-500/10 text-green-400" },
  awaiting_verification: { label: "Awaiting QA",   cls: "chip bg-amber-500/10 text-amber-400" },
  verified:              { label: "Verified",       cls: "chip bg-green-500/15 text-green-300" },
  reopened:              { label: "Reopened",       cls: "chip bg-orange-500/10 text-orange-400" },
  archived:              { label: "Archived",       cls: "chip bg-[var(--bg-subtle)] text-[var(--text-muted)]" },
};

const resolved = computed(() => map[props.status] ?? { label: props.status, cls: "chip text-[var(--text-muted)]" });
const cls   = computed(() => resolved.value.cls);
const label = computed(() => resolved.value.label);
</script>
