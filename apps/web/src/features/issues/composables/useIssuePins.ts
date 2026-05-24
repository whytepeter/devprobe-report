/**
 * useIssuePins
 * ────────────
 * TanStack Query wrapper over GET /annotation/pins?issueId=…
 *
 * Returns the pins grouped under a live-annotation issue, ordered by index
 * (#1, #2, #3 …). Powers the PinView on the issue detail page.
 *
 * Pins are immutable-ish (comments don't change often) but their STATUS can
 * change from the extension overlay, so we keep a moderate staleTime and let
 * a refocus / refetch pick up status changes.
 */
import { computed, type Ref } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { api } from "@/shared/lib/api.js";

export interface IssuePin {
  id:         string;
  sessionId:  string;
  issueId:    string | null;
  index:      number;
  anchor:     Record<string, unknown>;
  comment:    string;
  severity:   "low" | "medium" | "high" | "critical";
  issueType:  string;
  status:     string;
  assigneeId: string | null;
  labels:     string[];
  createdAt:  string;
}

export const issuePinsKey = (id: string) => ["issue", id, "pins"] as const;

export function useIssuePins(issueId: Ref<string>) {
  const query = useQuery({
    queryKey: computed(() => issuePinsKey(issueId.value)),
    enabled:  computed(() => !!issueId.value),
    queryFn:  async (): Promise<IssuePin[]> => {
      const res = await api.get(`/annotation/pins?issueId=${encodeURIComponent(issueId.value)}`);
      return (res.data.data ?? []) as IssuePin[];
    },
    staleTime: 30_000,
  });

  return {
    pins:    computed(() => query.data.value ?? []),
    loading: query.isPending,
    error:   computed(() => (query.error.value as Error | null)?.message ?? null),
    refetch: query.refetch,
  };
}
