<!--
  RecordingSidePanel
  ──────────────────
  Toggleable companion panel for the recording view. Slides in from the
  right (or collapses to a thin handle when closed) and hosts four tabs:

      Info │ Console ● │ Network ● │ Actions

  The red dot on the tab label appears when there are >0 errors in that
  bucket (drawn from the events stream) so the user can tell at a glance
  which tab has signal.

  Composition (kept narrow):
    • Header        → RecordingSidePanelHeader  (probe wordmark + session)
    • Tab strip     → inline, single source of truth for active tab + counts
    • Tab body      → <component :is="…"> picks the active tab
  Each tab owns its own filter state — this shell only routes.
-->
<template>
  <aside
    :class="[
      'flex h-full flex-col border-l border-border bg-background transition-[width] duration-200',
      open ? 'w-[440px]' : 'w-10',
    ]"
  >
    <!-- Collapsed: a thin handle with an expand affordance + tiny error badge -->
    <button
      v-if="!open"
      type="button"
      class="flex h-full w-full items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      aria-label="Open recording panel"
      @click="emit('toggle')"
    >
      <Icon name="chevron-left" :size="14" :stroke-width="2" />
    </button>

    <template v-else>
      <RecordingSidePanelHeader
        :duration-ms="durationMs"
        @share="emit('share')"
        @menu="emit('menu')"
      />

      <!-- Tab strip -->
      <nav class="flex items-center gap-0 border-b border-border px-3" role="tablist">
        <TabButton
          v-for="tab in TABS"
          :key="tab.id"
          :active="activeTab === tab.id"
          :error-count="errorCountsByTab[tab.id]"
          @click="emit('set-tab', tab.id)"
        >
          {{ tab.label }}
        </TabButton>

        <button
          type="button"
          class="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Collapse recording panel"
          @click="emit('toggle')"
        >
          <Icon name="chevron-right" :size="14" :stroke-width="2" />
        </button>
      </nav>

      <!-- Tab body -->
      <div class="flex-1 min-h-0 overflow-hidden">
        <component
          :is="activeComponent"
          :events="events"
          :issue="issue"
          @seek="emit('seek', $event)"
        />
      </div>
    </template>
  </aside>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Icon } from "@deveprobe/ui";
import RecordingSidePanelHeader from "./RecordingSidePanelHeader.vue";
import TabButton from "./TabButton.vue";
import InfoTab from "./tabs/info/InfoTab.vue";
import ConsoleTab from "./tabs/console/ConsoleTab.vue";
import NetworkTab from "./tabs/network/NetworkTab.vue";
import ActionsTab from "./tabs/actions/ActionsTab.vue";
import type { RecordingTab } from "./useRecordingSidePanel.js";
import type { Issue, TimelineEvent } from "@deveprobe/shared";

const props = defineProps<{
  open:       boolean;
  activeTab:  RecordingTab;
  issue:      Issue;
  events:     TimelineEvent[];
  durationMs: number;
}>();

const emit = defineEmits<{
  toggle:  [];
  share:   [];
  menu:    [];
  "set-tab": [tab: RecordingTab];
  seek:    [ms: number];
}>();

const TABS: { id: RecordingTab; label: string }[] = [
  { id: "info",     label: "Info" },
  { id: "console",  label: "Console" },
  { id: "network",  label: "Network" },
  { id: "actions",  label: "Actions" },
];

const COMPONENT_BY_TAB = {
  info:    InfoTab,
  console: ConsoleTab,
  network: NetworkTab,
  actions: ActionsTab,
};
const activeComponent = computed(() => COMPONENT_BY_TAB[props.activeTab]);

// ── Tab badge: red dot when the bucket contains errors ──────────────────────
// Console: console.level === 'error' OR error-kind rows.
// Network: status === 0 / ≥400.
// Actions / Info: never bubble.
const errorCountsByTab = computed<Record<RecordingTab, number>>(() => {
  let consoleErr = 0, networkErr = 0;
  for (const e of props.events) {
    if (e.kind === "error") consoleErr++;
    else if (e.kind === "console" && (e.data as { level?: string })?.level === "error") consoleErr++;
    else if (e.kind === "network") {
      const s = (e.data as { status?: number })?.status ?? 0;
      if (s === 0 || s >= 400) networkErr++;
    }
  }
  return { info: 0, console: consoleErr, network: networkErr, actions: 0 };
});
</script>
