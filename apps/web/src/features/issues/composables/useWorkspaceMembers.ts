/**
 * useWorkspaceMembers
 * ───────────────────
 * Members of the caller's active workspace — drives the assignee dropdown
 * on the IssueDetailsCard.
 *
 * Cached aggressively because the member list changes rarely (invites land
 * via separate flow). Use `queryClient.invalidateQueries({ queryKey:
 * workspaceMembersKey })` after invite-accept to refresh.
 */
import { useQuery } from "@tanstack/vue-query";
import { api } from "@/shared/lib/api.js";

export interface WorkspaceMember {
  id:        string;
  name:      string | null;
  email:     string | null;
  avatarUrl: string | null;
  role:      "admin" | "member" | "viewer" | "guest";
}

export const workspaceMembersKey = ["workspace", "members"] as const;

export function useWorkspaceMembers() {
  return useQuery({
    queryKey: workspaceMembersKey,
    queryFn:  async (): Promise<WorkspaceMember[]> => {
      const res = await api.get("/auth/workspace/members");
      return (res.data.data ?? []) as WorkspaceMember[];
    },
    staleTime: 5 * 60_000,
    gcTime:    30 * 60_000,
  });
}
