<template>
  <div class="flex-1 flex flex-col overflow-hidden">
    <PageHeader title="Folders">
      <template #meta>
        <span class="font-mono text-xs text-muted-foreground">{{ folders.length }}</span>
      </template>
      <Button size="sm" class="gap-1.5 text-xs" @click="creating = true">
        <Icon name="plus" :size="14" :stroke-width="2" />
        New folder
      </Button>
    </PageHeader>

    <div class="flex-1 overflow-auto px-6 py-5">
      <div v-if="loading" class="flex items-center justify-center py-16 text-sm text-muted-foreground">
        Loading folders…
      </div>

      <PageEmpty
        v-else-if="loadError"
        icon="circle-x"
        title="Couldn't load folders"
        :description="loadError"
      />

      <PageEmpty
        v-else-if="folders.length === 0"
        icon="folder-open"
        title="No folders yet"
        description="Folders group related issues — usually one per app, repo, or product. Create your first folder to start capturing bugs from the extension."
      >
        <Button size="sm" class="mt-2" @click="creating = true">Create folder</Button>
      </PageEmpty>

      <ul v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-w-5xl">
        <li v-for="f in folders" :key="f.id">
          <FolderCard :folder="f" />
        </li>
      </ul>
    </div>

    <CreateFolderDialog v-model:open="creating" :submit="create" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { Button, Icon } from "@deveprobe/ui";
import PageHeader from "@/features/workspace-shell/components/PageHeader.vue";
import PageEmpty from "@/features/workspace-shell/components/PageEmpty.vue";
import FolderCard from "@/features/folders/components/FolderCard.vue";
import CreateFolderDialog from "@/features/folders/components/CreateFolderDialog.vue";
import { useFolders } from "@/features/folders/composables/useFolders.js";

const { folders, loading, loadError, load, create } = useFolders();
const creating = ref(false);

onMounted(load);
</script>
