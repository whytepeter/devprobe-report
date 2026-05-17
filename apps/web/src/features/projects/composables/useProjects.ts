import { ref } from "vue";
import { api } from "@/shared/lib/api.js";
import type { Project, CreateProjectInput } from "@deveprobe/shared";

/**
 * Owns the projects list — fetch, create, in-place prepend on success.
 * Components are presentational only.
 */
export function useProjects() {
  const projects = ref<Project[]>([]);
  const loading = ref(true);
  const loadError = ref("");

  async function load() {
    loading.value = true;
    loadError.value = "";
    try {
      const res = await api.get("/projects");
      projects.value = res.data.data as Project[];
    } catch (e) {
      loadError.value = (e as Error).message || "Couldn't load projects.";
    } finally {
      loading.value = false;
    }
  }

  async function create(input: CreateProjectInput): Promise<Project> {
    const res = await api.post("/projects", input);
    const project = res.data.data as Project;
    projects.value = [project, ...projects.value];
    return project;
  }

  return { projects, loading, loadError, load, create };
}
