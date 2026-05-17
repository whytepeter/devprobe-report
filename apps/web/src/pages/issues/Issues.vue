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

    <div class="flex-1 overflow-y-auto">
      <div v-if="loading" class="flex items-center justify-center py-16 text-sm text-muted-foreground">
        Loading issues…
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
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import PageHeader from "@/features/workspace-shell/components/PageHeader.vue";
import PageEmpty from "@/features/workspace-shell/components/PageEmpty.vue";
import IssueFilters from "@/features/dashboard/components/IssueFilters.vue";
import IssueGrid from "@/features/dashboard/components/IssueGrid.vue";
import IssueList from "@/features/dashboard/components/IssueList.vue";
import ViewToggle, { type IssuesView } from "@/features/dashboard/components/ViewToggle.vue";
import { useIssues } from "@/features/dashboard/composables/useIssues.js";

const { issues, loading, loadError, filters, filtered, hasFilters, clearFilters, load } = useIssues();

const view = ref<IssuesView>("grid");
const sort = ref<string>("recent");

onMounted(load);
</script>
