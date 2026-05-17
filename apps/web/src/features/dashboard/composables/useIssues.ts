import { ref, computed, reactive } from "vue";
import { api } from "@/shared/lib/api.js";
import type { Issue, IssueMode, IssueStatus, Severity } from "@deveprobe/shared";

// "all" is a sentinel value used by the filter UI (shadcn Select can't have
// an empty-string item value), and is treated as "no filter" everywhere.
export interface IssueFilters {
  q: string;
  status: IssueStatus | "all";
  severity: Severity | "all";
  mode: IssueMode | "all";
}

export function useIssues() {
  const issues = ref<Issue[]>([]);
  const loading = ref(true);
  const loadError = ref("");

  const filters = reactive<IssueFilters>({
    q: "",
    status: "all",
    severity: "all",
    mode: "all",
  });

  const hasFilters = computed(
    () =>
      filters.q !== "" ||
      filters.status !== "all" ||
      filters.severity !== "all" ||
      filters.mode !== "all",
  );

  const filtered = computed(() =>
    issues.value.filter((i) => {
      if (filters.status !== "all" && i.status !== filters.status) return false;
      if (filters.severity !== "all" && i.severity !== filters.severity) return false;
      if (filters.mode !== "all" && i.mode !== filters.mode) return false;
      if (filters.q) {
        const needle = filters.q.toLowerCase();
        return (
          i.title.toLowerCase().includes(needle) ||
          i.id.toLowerCase().includes(needle) ||
          i.summary?.toLowerCase().includes(needle) ||
          i.pageUrl?.toLowerCase().includes(needle) ||
          i.labels.some((l) => l.toLowerCase().includes(needle))
        );
      }
      return true;
    }),
  );

  function clearFilters() {
    filters.q = "";
    filters.status = "all";
    filters.severity = "all";
    filters.mode = "all";
  }

  async function load() {
    loading.value = true;
    loadError.value = "";
    try {
      const res = await api.get("/issues");
      issues.value = res.data.data as Issue[];
    } catch (e) {
      loadError.value = (e as Error).message || "Couldn't load issues.";
    } finally {
      loading.value = false;
    }
  }

  return { issues, loading, loadError, filters, filtered, hasFilters, clearFilters, load };
}
