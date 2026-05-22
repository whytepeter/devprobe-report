<!--
  IssueCard
  ─────────
  Grid card for the Issues page. Top is a square-ish media area with the
  capture-mode chip overlaid; bottom is title + footer (id · author · time ·
  severity). Footer mirrors the Linear/Sentry conventions so it scans fast.
-->
<template>
  <article
    :class="[
      'group relative rounded-xl border bg-card overflow-hidden cursor-pointer transition-all duration-150 focus-visible:outline-none',
      isSelected
        ? 'border-primary ring-2 ring-primary/20'
        : 'border-border hover:border-primary/40 hover:shadow-md',
    ]"
    tabindex="0"
    role="button"
    draggable="true"
    :aria-selected="isSelected"
    @click="onCardClick"
    @keydown.enter="$router.push(`/issue/${issue.id}`)"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
  >
    <!-- Hover/selected: selection checkbox.
         z-20 sits above the type chip; pointer-events-auto on the button so
         clicks don't bubble to the card navigate. -->
    <button
      type="button"
      :class="[
        'absolute top-2.5 right-2.5 z-20 flex h-5 w-5 items-center justify-center rounded-md border transition-all',
        isSelected
          ? 'border-primary bg-primary text-primary-foreground opacity-100'
          : 'border-border bg-card/90 backdrop-blur-sm text-transparent opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
      ]"
      :aria-label="isSelected ? 'Unselect issue' : 'Select issue'"
      :aria-pressed="isSelected"
      @click.stop="selection.toggle(issue.id)"
    >
      <Icon v-if="isSelected" name="check" :size="12" :stroke-width="3" />
    </button>

    <!-- Media area -->
    <div class="relative aspect-[16/10] bg-muted/40 border-b border-border overflow-hidden">
      <!-- Recording: video poster (first frame) with play badge -->
      <template v-if="videoUrl">
        <video
          :src="videoUrl"
          class="h-full w-full object-cover bg-black"
          preload="metadata"
          muted
          playsinline
          @loadedmetadata="primePoster"
        />
        <span class="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span class="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 ring-1 ring-white/20 backdrop-blur-sm">
            <Icon name="play" :size="16" class="text-white" />
          </span>
        </span>
      </template>

      <!-- Screenshot / annotation thumbnail -->
      <img
        v-else-if="thumbnailUrl && !imageBroken"
        :src="thumbnailUrl"
        :alt="issue.title"
        class="w-full h-full object-cover"
        loading="lazy"
        @error="imageBroken = true"
      />

      <!-- Placeholder skeleton -->
      <div v-else class="absolute inset-0 p-6 flex flex-col gap-2.5 justify-center">
        <div class="h-2 w-1/2 rounded bg-muted-foreground/15" />
        <div class="h-3 w-1/3 rounded bg-primary/25" />
        <div class="h-2 w-2/3 rounded bg-muted-foreground/10" />
      </div>

      <!-- Top-left type chip -->
      <div class="absolute top-2.5 left-2.5">
        <TypeChip :mode="issue.mode" />
      </div>
    </div>

    <!-- Body -->
    <div class="px-3.5 pt-3 pb-3 space-y-2">
      <p class="text-[13.5px] font-medium leading-snug line-clamp-1 text-foreground">
        {{ issue.title }}
      </p>

      <div class="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span class="font-mono shrink-0">{{ shortId }}</span>
        <span aria-hidden="true">·</span>
        <UserAvatar :user="issue.createdBy" size="xs" />
        <span class="truncate flex-1">{{ timeAgo(issue.createdAt) }}</span>
        <span class="flex items-center gap-1 shrink-0">
          <span
            class="h-1.5 w-1.5 rounded-full"
            :class="severityDot"
            aria-hidden="true"
          />
          <span class="text-foreground/80 capitalize">{{ severityLabel }}</span>
        </span>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref, toRef, watch } from "vue";
import { useRouter } from "vue-router";
import type { Issue, Attachment } from "@deveprobe/shared";
import { Icon } from "@deveprobe/ui";
import TypeChip from "@/features/issues/components/TypeChip.vue";
import UserAvatar from "@/features/issues/components/UserAvatar.vue";
import { timeAgo } from "@/shared/lib/format.js";
import { useAttachmentUrl } from "@/features/issues/composables/useAttachmentUrl.js";
import { useIssueSelection } from "@/features/dashboard/composables/useIssueSelection.js";

type IssueCardIssue = Issue & {
  attachments?: Attachment[];
  createdBy?: { id: string; name: string | null; email: string | null; avatarUrl: string | null } | null;
};

const props = defineProps<{ issue: IssueCardIssue }>();

// Recording: prefer the video attachment so we can show its first frame.
const videoAttachmentId = computed(() => {
  if (props.issue.mode !== "screen_recording") return null;
  return (props.issue.attachments ?? []).find((a) => a.type === "video")?.id ?? null;
});

// Screenshot / annotation: image attachment.
const thumbnailAttachmentId = computed(() => {
  if (videoAttachmentId.value) return null;
  const att = (props.issue.attachments ?? []).find(
    (a) => a.type === "screenshot" || a.type === "thumbnail",
  );
  return att?.id ?? null;
});

const issueIdRef = toRef(props.issue, "id");
const { url: thumbnailUrl } = useAttachmentUrl(() => thumbnailAttachmentId.value);
const { url: videoUrl }     = useAttachmentUrl(() => videoAttachmentId.value);

// Track broken (failed-to-decode) images so we render the placeholder instead.
const imageBroken = ref(false);
watch(thumbnailUrl, () => { imageBroken.value = false; });

// Force the video to render its first frame as a poster image.
// Chrome+Safari only paint a frame after a non-zero currentTime seek; nudging
// to 0.05s reliably surfaces the opening frame without playing.
function primePoster(e: Event) {
  const v = e.target as HTMLVideoElement;
  try { v.currentTime = 0.05; } catch { /* ignore */ }
}

void issueIdRef;

const SEVERITY_DOTS: Record<string, string> = {
  critical: "bg-red-500",
  high:     "bg-orange-500",
  medium:   "bg-amber-400",
  low:      "bg-emerald-500",
};

const severityDot = computed(() => SEVERITY_DOTS[props.issue.severity ?? ""] ?? "bg-neutral-400");
const severityLabel = computed(() => props.issue.severity ?? "—");

const shortId = computed(() => {
  // Render the leading 8 chars of the uuid until we ship the human DP-128 numbering.
  return props.issue.id.slice(0, 8);
});

// ── Selection ──────────────────────────────────────────────────────────────
const selection = useIssueSelection();
const isSelected = computed(() => selection.isSelected(props.issue.id));

// Card-level click: when any cards are selected, plain clicks should TOGGLE
// the card's own selection (matches Linear/Notion multi-select feel). Only
// navigate to the issue when nothing is selected.
const router = useRouter();
function onCardClick() {
  if (selection.hasSelection.value) {
    selection.toggle(props.issue.id);
    return;
  }
  router.push(`/issue/${props.issue.id}`);
}

// ── Drag-to-folder ─────────────────────────────────────────────────────────
// Drop targets (folder sidebar items) read `text/x-devprobe-issue` to
// disambiguate from generic dragged content like text selections.
// Multi-select drag: drop all selected issues at once if this issue is among
// the selected set; otherwise drag just this one.
const DRAG_MIME = "text/x-devprobe-issue";

function onDragStart(e: DragEvent) {
  if (!e.dataTransfer) return;
  const ids = isSelected.value && selection.count.value > 1
    ? selection.selectedIds.value
    : [props.issue.id];
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData(DRAG_MIME, JSON.stringify(ids));
  // Plain-text fallback (some drop UIs sniff text/plain to filter dragenter).
  e.dataTransfer.setData("text/plain", ids.join(","));
}
function onDragEnd(_e: DragEvent) { /* nothing — drop target owns the mutation */ }
</script>
