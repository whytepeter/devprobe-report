import { ref } from "vue";
import { api } from "@/shared/lib/api.js";
import type { Folder, CreateFolderInput } from "@deveprobe/shared";

/**
 * Owns the folders list — fetch, create, in-place prepend on success.
 * Components are presentational only.
 */
export function useFolders() {
  const folders = ref<Folder[]>([]);
  const loading = ref(true);
  const loadError = ref("");

  async function load() {
    loading.value = true;
    loadError.value = "";
    try {
      const res = await api.get("/folders");
      folders.value = res.data.data as Folder[];
    } catch (e) {
      loadError.value = (e as Error).message || "Couldn't load folders.";
    } finally {
      loading.value = false;
    }
  }

  async function create(input: CreateFolderInput): Promise<Folder> {
    const res = await api.post("/folders", input);
    const folder = res.data.data as Folder;
    folders.value = [folder, ...folders.value];
    return folder;
  }

  return { folders, loading, loadError, load, create };
}
