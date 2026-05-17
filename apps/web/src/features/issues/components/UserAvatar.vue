<!--
  UserAvatar
  ──────────
  Initial-circle avatar. Uses the user's name (or email fallback) to pick a
  stable warm palette so different members read as visually distinct.
-->
<template>
  <Avatar :class="sizeClass">
    <AvatarImage v-if="user?.avatarUrl" :src="user.avatarUrl" :alt="user.name" />
    <AvatarFallback
      :class="[fallbackClass, paletteClass]"
    >
      {{ initial }}
    </AvatarFallback>
  </Avatar>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Avatar, AvatarFallback, AvatarImage } from "@deveprobe/ui";

type CreatedBy = {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
};

const props = withDefaults(
  defineProps<{
    user: CreatedBy | null | undefined;
    size?: "xs" | "sm" | "md";
  }>(),
  { size: "sm" },
);

const SIZE: Record<NonNullable<typeof props.size>, { wrap: string; text: string }> = {
  xs: { wrap: "h-5 w-5", text: "text-[9px]" },
  sm: { wrap: "h-6 w-6", text: "text-[10px]" },
  md: { wrap: "h-8 w-8", text: "text-xs" },
};

const sizeClass = computed(() => SIZE[props.size].wrap);
const fallbackClass = computed(() => `${SIZE[props.size].text} font-semibold text-white`);

const PALETTE = [
  "bg-emerald-600",
  "bg-sky-600",
  "bg-violet-600",
  "bg-rose-600",
  "bg-amber-600",
  "bg-teal-600",
  "bg-fuchsia-600",
  "bg-orange-600",
];

const initial = computed(() => {
  const name = props.user?.name ?? props.user?.email ?? "";
  return (name[0] ?? "?").toUpperCase();
});

const paletteClass = computed(() => {
  const seed = props.user?.id ?? props.user?.email ?? props.user?.name ?? "?";
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length] ?? "bg-neutral-500";
});
</script>
