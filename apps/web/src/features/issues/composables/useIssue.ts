/**
 * useIssue
 * ────────
 * TanStack Query wrapper over GET /issues/:id.
 *
 * Returns the same shape the page already consumes (`issue`, `loading`,
 * `error`, `errorMessage`) so the IssuePage template didn't have to change.
 * The benefits TanStack gives us for free:
 *   • cache by id — going to /issues, clicking back into the same issue is
 *     instant; refetches in the background to keep it fresh
 *   • automatic refetch on issueId change (no manual watch)
 *   • dedup — opening the same issue in two components fires one request
 *
 * Auth short-circuit kept: when there's no token we never enqueue a query;
 * the page renders an inline sign-in CTA without bouncing through the api
 * interceptor.
 */
import { computed, type Ref } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { api } from "@/shared/lib/api.js";
import { useAuthStore } from "@/features/auth/auth.store.js";
import type { Issue, Attachment } from "@deveprobe/shared";

export type IssueLoadError = "unauthorized" | "not-found" | "network" | null;

export interface PublicUser {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
}

/** Server hydrates createdBy + attachments inline on GET /issues/:id. */
export type IssueWithAttachments = Issue & {
  attachments: Attachment[];
  createdBy?: PublicUser | null;
};

/** Query-key helper — exported so mutations can invalidate this entry. */
export const issueKey = (id: string) => ["issue", id] as const;

export function useIssue(issueId: Ref<string>) {
  const auth = useAuthStore();

  const query = useQuery({
    queryKey: computed(() => issueKey(issueId.value)),
    // `enabled` gates the fetch: skip when there's no id yet, or when the
    // user isn't authenticated (we render an inline sign-in CTA instead).
    enabled:  computed(() => !!issueId.value && auth.isAuthenticated),
    queryFn:  async (): Promise<IssueWithAttachments> => {
      const res = await api.get(`/issues/${issueId.value}`);
      const raw = res.data.data as IssueWithAttachments;
      return { ...raw, attachments: raw.attachments ?? [] };
    },
    // Issues update via comments/status changes — keep this short so a tab
    // returning from background grabs fresh data on next interaction.
    staleTime: 15_000,
  });

  // Translate TanStack's flat error into the page's discriminated union so
  // the template can switch on a stable string set.
  const error = computed<IssueLoadError>(() => {
    if (!auth.isAuthenticated) return "unauthorized";
    if (!query.error.value)    return null;
    const status = (query.error.value as { response?: { status?: number } }).response?.status;
    if (status === 404) return "not-found";
    if (status === 401) return "unauthorized";
    return "network";
  });

  const errorMessage = computed(() =>
    (query.error.value as Error | null)?.message ?? "Couldn't load this issue.",
  );

  return {
    issue:        computed(() => query.data.value ?? null),
    loading:      computed(() => query.isPending.value && auth.isAuthenticated),
    error,
    errorMessage,
    /** Force a fresh fetch — useful after a mutation that the parent owns. */
    refetch:      query.refetch,
  };
}
