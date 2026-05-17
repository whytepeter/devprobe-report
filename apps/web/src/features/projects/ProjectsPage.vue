<template>
  <div class="flex-1 flex flex-col overflow-hidden">
    <PageHeader title="Projects">
      <template #meta>
        <span class="font-mono text-xs text-muted-foreground">{{ projects.length }}</span>
      </template>
      <Button size="sm" class="gap-1.5 text-xs" @click="creating = true">
        <Icon name="plus" :size="14" :stroke-width="2" />
        New project
      </Button>
    </PageHeader>

    <div class="flex-1 overflow-auto px-6 py-5">
      <div v-if="loading" class="flex items-center justify-center py-16 text-sm text-muted-foreground">
        Loading projects…
      </div>

      <PageEmpty
        v-else-if="loadError"
        icon="circle-x"
        title="Couldn't load projects"
        :description="loadError"
      />

      <PageEmpty
        v-else-if="projects.length === 0"
        icon="folder-open"
        title="No projects yet"
        description="Projects group related issues — usually one per app, repo, or product. Create your first project to start capturing bugs from the extension."
      >
        <Button size="sm" class="mt-2" @click="creating = true">Create project</Button>
      </PageEmpty>

      <ul v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-w-5xl">
        <li v-for="p in projects" :key="p.id">
          <ProjectCard :project="p" />
        </li>
      </ul>
    </div>

    <CreateProjectDialog v-model:open="creating" :submit="create" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { Button, Icon } from "@deveprobe/ui";
import PageHeader from "@/features/workspace-shell/components/PageHeader.vue";
import PageEmpty from "@/features/workspace-shell/components/PageEmpty.vue";
import ProjectCard from "@/features/projects/components/ProjectCard.vue";
import CreateProjectDialog from "@/features/projects/components/CreateProjectDialog.vue";
import { useProjects } from "@/features/projects/composables/useProjects.js";

const { projects, loading, loadError, load, create } = useProjects();
const creating = ref(false);

onMounted(load);
</script>
