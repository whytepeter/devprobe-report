<template>
  <div class="flex-1 flex flex-col overflow-hidden">
    <PageHeader title="Issues">
      <template #meta>
        <span class="text-xs text-muted-foreground">{{ filtered.length }} items</span>
      </template>
      <ViewToggle v-model="view" />
    </PageHeader>

    <IssueFilters
      :filters="filters"
      :has-filters="hasFilters"
      v-model:sort="sort"
      @clear="clearFilters"
    />

    <div class="flex-1 overflow-y-auto pb-20">
      <!-- Pending → skeleton grid. Mirrors IssueGrid's exact breakpoint columns
           (1 / 2 / 3 / 4) so the layout doesn't reflow when real data arrives. -->
      <div
        v-if="loading"
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-6 py-5"
        aria-busy="true"
      >
        <IssueCardSkeleton v-for="i in 8" :key="i" />
      </div>

      <PageEmpty
        v-else-if="loadError"
        icon="circle-x"
        title="Couldn't load issues"
        :description="loadError"
      />

      <PageEmpty
        v-else-if="issues.length === 0"
        icon="bug"
        title="No issues yet"
        description="Capture your first bug from the DevProbe extension to see it here."
      />

      <PageEmpty
        v-else-if="filtered.length === 0"
        icon="search-x"
        title="No issues match"
        description="Try adjusting your filters."
      />

      <IssueGrid v-else-if="view === 'grid'" :issues="filtered" />
      <IssueList v-else :issues="filtered" />
    </div>

    <!-- Floating bulk-actions bar — renders only when there's a selection. -->
    <IssuesBulkBar />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from "vue";
import PageHeader from "@/features/workspace-shell/components/PageHeader.vue";
import PageEmpty from "@/features/workspace-shell/components/PageEmpty.vue";
import IssueFilters from "@/features/dashboard/components/IssueFilters.vue";
import IssueGrid from "@/features/dashboard/components/IssueGrid.vue";
import IssueList from "@/features/dashboard/components/IssueList.vue";
import IssueCardSkeleton from "@/features/dashboard/components/IssueCardSkeleton.vue";
import IssuesBulkBar from "@/features/dashboard/components/IssuesBulkBar.vue";
import ViewToggle, { type IssuesView } from "@/features/dashboard/components/ViewToggle.vue";
import { useIssues } from "@/features/dashboard/composables/useIssues.js";
import { useIssueSelection } from "@/features/dashboard/composables/useIssueSelection.js";

const { issues, loading, loadError, filters, filtered, hasFilters, clearFilters, load } = useIssues();
const selection = useIssueSelection();

const view = ref<IssuesView>("grid");
const sort = ref<string>("recent");

onMounted(load);

// Selection is page-local — bail when leaving the route so the bulk bar
// doesn't reappear on another page.
onBeforeUnmount(() => selection.clear());
</script>
