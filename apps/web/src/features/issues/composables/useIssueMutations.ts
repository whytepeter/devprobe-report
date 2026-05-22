/**
 * useIssueMutations
 * ─────────────────
 * TanStack mutations for the three issue write paths:
 *   • update  — PATCH /issues/:id      (status / severity / assignee / labels / folder)
 *   • delete  — DELETE /issues/:id     (single)
 *   • bulk    — POST   /issues/bulk    (multi-select toolbar)
 *
 * All three invalidate the cached issue list + the affected issue's detail
 * cache so the UI updates without manual refetching. They also support
 * optimistic updates via `onMutate` hooks the caller can provide — useful
 * for the drag/drop folder reassignment which should feel instant.
 */
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { api } from "@/shared/lib/api.js";
import { issueKey } from "./useIssue.js";
import type { Issue, IssueStatus, UpdateIssueInput } from "@deveprobe/shared";

/**
 * Bulk-action request body for POST /issues/bulk. Local to the web app —
 * the API validates with its own zod schema and `@deveprobe/shared` is
 * reserved for genuinely cross-runtime schemas.
 */
export type BulkIssueAction =
  | { action: "delete";          ids: string[] }
  | { action: "move-to-folder";  ids: string[]; folderId: string | null }
  | { action: "set-status";      ids: string[]; status: IssueStatus };

/** Query key for the workspace-scoped issues list — exported so callers can target invalidations. */
export const issuesListKey = ["issues"] as const;

// ── PATCH /issues/:id ───────────────────────────────────────────────────────
export function useUpdateIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; patch: UpdateIssueInput }): Promise<Issue> => {
      const res = await api.patch(`/issues/${vars.id}`, vars.patch);
      return res.data.data as Issue;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: issueKey(vars.id) });
      qc.invalidateQueries({ queryKey: issuesListKey });
    },
  });
}

// ── DELETE /issues/:id ──────────────────────────────────────────────────────
export function useDeleteIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await api.delete(`/issues/${id}`);
    },
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: issueKey(id) });
      qc.invalidateQueries({ queryKey: issuesListKey });
    },
  });
}

// ── POST /issues/bulk ───────────────────────────────────────────────────────
export function useBulkUpdateIssues() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (action: BulkIssueAction): Promise<{ affected: number }> => {
      const res = await api.post(`/issues/bulk`, action);
      return res.data.data as { affected: number };
    },
    onSuccess: (_data, action) => {
      // List view always needs refreshing; individual details only matter
      // for non-delete actions.
      qc.invalidateQueries({ queryKey: issuesListKey });
      if (action.action !== "delete") {
        for (const id of action.ids) qc.invalidateQueries({ queryKey: issueKey(id) });
      } else {
        for (const id of action.ids) qc.removeQueries({ queryKey: issueKey(id) });
      }
    },
  });
}
