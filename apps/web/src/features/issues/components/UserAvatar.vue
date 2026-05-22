<!--
  UserAvatar
  ──────────
  Initial-circle avatar. Uses the user's name (or email fallback) to pick a
  stable warm palette so different members read as visually distinct.
-->
<template>
  <Avatar :class="[sizeClass, 'ring-1 ring-black/[0.06] dark:ring-white/[0.08] shadow-sm']">
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

// Curated palette — mid-tone saturated shades that read clean against white
// text. Avoids the muddy `-600` reds/oranges that look dirty at small sizes.
// Eight buckets so a workspace of ~8 members rarely collides.
const PALETTE = [
  "bg-emerald-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-pink-500",
  "bg-amber-500",
  "bg-teal-500",
  "bg-indigo-500",
  "bg-orange-500",
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
