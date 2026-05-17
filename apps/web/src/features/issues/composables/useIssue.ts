import { ref, watch, type Ref } from "vue";
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

/**
 * Fetches a single issue scoped by the authenticated org. Short-circuits to
 * `unauthorized` when there's no token so the page can render an inline
 * sign-in CTA without bouncing through the api interceptor.
 */
export function useIssue(issueId: Ref<string>) {
  const auth = useAuthStore();

  const issue = ref<IssueWithAttachments | null>(null);
  const loading = ref(false);
  const error = ref<IssueLoadError>(null);
  const errorMessage = ref("Couldn't load this issue.");

  async function load() {
    if (!issueId.value) return;
    loading.value = true;
    issue.value = null;
    error.value = null;

    if (!auth.isAuthenticated) {
      error.value = "unauthorized";
      loading.value = false;
      return;
    }

    try {
      const res = await api.get(`/issues/${issueId.value}`);
      const raw = res.data.data as IssueWithAttachments;
      issue.value = { ...raw, attachments: raw.attachments ?? [] };
    } catch (e) {
      const status = (e as { response?: { status?: number } }).response?.status;
      if (status === 404) error.value = "not-found";
      else if (status === 401) error.value = "unauthorized";
      else {
        error.value = "network";
        errorMessage.value = (e as Error).message;
      }
    } finally {
      loading.value = false;
    }
  }

  watch(issueId, load, { immediate: true });

  return { issue, loading, error, errorMessage };
}
