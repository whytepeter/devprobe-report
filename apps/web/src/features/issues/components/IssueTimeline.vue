<!--
  IssueTimeline
  ─────────────
  Correlated panels for a screen-recording issue. Displays timeline events
  collected during the recording in five tabs:

    Console     — console.log / info / warn / error / debug
    Network     — fetch + XHR requests (redacted)
    Errors      — JS errors + unhandled rejections
    User Actions — clicks (privacy-safe labels)
    Navigation  — pushState / replaceState / popstate

  Clicking a timestamp chip seeks the video to that moment (when seekTo is
  provided by the parent — only for recording issues with a video player).

  Empty state: if no events were saved (older recordings pre-dating the
  capture pipeline), the panel shows a soft placeholder.
-->
<template>
  <section class="space-y-3">
    <div class="flex items-center gap-2">
      <h2 class="text-[13px] font-semibold text-foreground">Timeline</h2>
      <span v-if="total > 0" class="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground tabular-nums">
        {{ total }}
      </span>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="py-10 flex items-center justify-center text-sm text-muted-foreground gap-2">
      <span class="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      Loading timeline…
    </div>

    <!-- Error -->
    <div v-else-if="error" class="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
      {{ error }}
    </div>

    <!-- No events -->
    <div v-else-if="total === 0" class="rounded-xl border border-border bg-muted/20 px-4 py-8 text-center space-y-1">
      <p class="text-sm text-foreground/60">No timeline events captured.</p>
      <p class="text-xs text-muted-foreground">Events are collected by the extension during recording and uploaded on submit.</p>
    </div>

    <!-- Tabs -->
    <div v-else class="rounded-xl border border-border overflow-hidden">
      <!-- Tab bar -->
      <div class="flex border-b border-border bg-muted/30 overflow-x-auto">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          :disabled="tab.count === 0"
          class="flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-medium whitespace-nowrap transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          :class="activeTab === tab.key
            ? 'border-b-2 border-primary text-primary bg-background -mb-px'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'"
          @click="activeTab = tab.key"
        >
          <Icon :name="tab.icon" :size="13" :stroke-width="1.75" />
          {{ tab.label }}
          <span
            v-if="tab.count > 0"
            class="rounded-full px-1.5 py-0.5 text-[10px] tabular-nums leading-none"
            :class="tab.count > 0 && tab.key === 'error'
              ? 'bg-destructive/15 text-destructive'
              : 'bg-muted text-muted-foreground'"
          >
            {{ tab.count }}
          </span>
        </button>
      </div>

      <!-- Event list -->
      <div class="divide-y divide-border bg-background max-h-[460px] overflow-y-auto">
        <!-- Console -->
        <template v-if="activeTab === 'console'">
          <TimelineRow
            v-for="ev in byKind.console"
            :key="ev.id"
            :event="ev"
            :seek-to="seekTo"
          >
            <template #badge>
              <ConsoleBadge :level="(ev.data?.level as string) || 'log'" />
            </template>
          </TimelineRow>
        </template>

        <!-- Network -->
        <template v-else-if="activeTab === 'network'">
          <TimelineRow
            v-for="ev in byKind.network"
            :key="ev.id"
            :event="ev"
            :seek-to="seekTo"
          >
            <template #badge>
              <NetworkBadge :data="ev.data" />
            </template>
          </TimelineRow>
        </template>

        <!-- Errors -->
        <template v-else-if="activeTab === 'error'">
          <TimelineRow
            v-for="ev in byKind.error"
            :key="ev.id"
            :event="ev"
            :seek-to="seekTo"
          >
            <template #badge>
              <SeverityPill :severity="ev.severity" />
            </template>
          </TimelineRow>
        </template>

        <!-- User actions -->
        <template v-else-if="activeTab === 'user_action'">
          <TimelineRow
            v-for="ev in byKind.user_action"
            :key="ev.id"
            :event="ev"
            :seek-to="seekTo"
          />
        </template>

        <!-- Navigation -->
        <template v-else-if="activeTab === 'navigation'">
          <TimelineRow
            v-for="ev in byKind.navigation"
            :key="ev.id"
            :event="ev"
            :seek-to="seekTo"
          />
        </template>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { Icon } from "@deveprobe/ui";
import type { TimelineEvent } from "@deveprobe/shared";
import type { EventsByKind } from "@/features/issues/composables/useIssueEvents.js";
import TimelineRow from "@/features/issues/components/TimelineRow.vue";
import ConsoleBadge from "@/features/issues/components/ConsoleBadge.vue";
import NetworkBadge from "@/features/issues/components/NetworkBadge.vue";
import SeverityPill from "@/features/issues/components/SeverityPill.vue";

type TabKey = "console" | "network" | "error" | "user_action" | "navigation";

const props = defineProps<{
  events:   TimelineEvent[];
  byKind:   EventsByKind;
  total:    number;
  loading:  boolean;
  error:    string | null;
  /** Passed when a video player is on the page — clicking a timestamp seeks it. */
  seekTo?: (ms: number) => void;
}>();

const activeTab = ref<TabKey>("console");

const tabs = computed(() => [
  { key: "console"     as TabKey, label: "Console",      icon: "terminal",        count: props.byKind.console.length },
  { key: "network"     as TabKey, label: "Network",      icon: "wifi",            count: props.byKind.network.length },
  { key: "error"       as TabKey, label: "Errors",       icon: "circle-x",        count: props.byKind.error.length },
  { key: "user_action" as TabKey, label: "User Actions", icon: "mouse-pointer-2", count: props.byKind.user_action.length },
  { key: "navigation"  as TabKey, label: "Navigation",   icon: "navigation",      count: props.byKind.navigation.length },
]);
</script>
