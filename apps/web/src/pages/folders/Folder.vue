<template>
  <div class="flex-1 flex flex-col overflow-hidden">
    <PageHeader :title="folder?.name ?? 'Folder'">
      <template #meta>
        <Icon
          name="folder"
          :size="14"
          :stroke-width="1.75"
          :class="folder ? folderColor(folder.id) : 'text-muted-foreground'"
        />
        <span class="text-xs text-muted-foreground">{{ scopedFiltered.length }} items</span>
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
      <div v-if="loading || folderLoading" class="flex items-center justify-center py-16 text-sm text-muted-foreground">
        Loading…
      </div>

      <PageEmpty
        v-else-if="loadError"
        icon="circle-x"
        title="Couldn't load issues"
        :description="loadError"
      />

      <PageEmpty
        v-else-if="!folder"
        icon="search-x"
        title="Folder not found"
        description="This folder doesn't exist in your workspace, or it was archived."
      />

      <PageEmpty
        v-else-if="scopedIssues.length === 0"
        icon="bug"
        title="No issues in this folder"
        description="Issues captured against this folder will show up here."
      />

      <PageEmpty
        v-else-if="scopedFiltered.length === 0"
        icon="search-x"
        title="No issues match"
        description="Try adjusting your filters."
      />

      <IssueGrid v-else-if="view === 'grid'" :issues="scopedFiltered" />
      <IssueList v-else :issues="scopedFiltered" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { Icon } from "@deveprobe/ui";
import PageHeader from "@/features/workspace-shell/components/PageHeader.vue";
import PageEmpty from "@/features/workspace-shell/components/PageEmpty.vue";
import IssueFilters from "@/features/dashboard/components/IssueFilters.vue";
import IssueGrid from "@/features/dashboard/components/IssueGrid.vue";
import IssueList from "@/features/dashboard/components/IssueList.vue";
import ViewToggle, { type IssuesView } from "@/features/dashboard/components/ViewToggle.vue";
import { useIssues } from "@/features/dashboard/composables/useIssues.js";
import { useFolders } from "@/features/folders/composables/useFolders.js";
import { folderColor } from "@/features/folders/utils/color.js";

const route = useRoute();
const folderId = computed(() => route.params["id"] as string);

const { folders, loading: folderLoading, load: loadFolders } = useFolders();
const folder = computed(() => folders.value.find((f) => f.id === folderId.value) ?? null);

const { issues, loading, loadError, filters, filtered, hasFilters, clearFilters, load } = useIssues();

// useIssues runs status/severity/mode/q filtering on the full org list; we
// then narrow to this folder's id. Two `computed`s so the empty states can
// distinguish "folder has no issues" vs. "filters hid everything".
const scopedIssues = computed(() => issues.value.filter((i) => i.folderId === folderId.value));
const scopedFiltered = computed(() => filtered.value.filter((i) => i.folderId === folderId.value));

const view = ref<IssuesView>("grid");
const sort = ref<string>("recent");

onMounted(async () => {
  await Promise.all([load(), loadFolders()]);
});

watch(folderId, () => {
  clearFilters();
});
</script>
