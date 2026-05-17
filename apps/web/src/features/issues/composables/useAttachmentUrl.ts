import { ref, watchEffect, onScopeDispose } from "vue";
import { api } from "@/shared/lib/api.js";

/**
 * Fetches an attachment's binary content as an authed blob and exposes a
 * local object-URL. `<img>` tags can't carry an Authorization header so we
 * can't just point them at the server URL.
 */
export function useAttachmentUrl(attachmentId: () => string | null) {
  const url = ref<string | null>(null);
  const loading = ref(false);
  const error = ref("");

  let currentObjectUrl: string | null = null;

  function revoke() {
    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl);
      currentObjectUrl = null;
    }
  }

  watchEffect(async () => {
    const id = attachmentId();
    revoke();
    url.value = null;
    error.value = "";
    if (!id) return;

    loading.value = true;
    try {
      const res = await api.get(`/attachments/${id}/content`, { responseType: "blob" });
      currentObjectUrl = URL.createObjectURL(res.data as Blob);
      url.value = currentObjectUrl;
    } catch (e) {
      error.value = (e as Error).message || "Couldn't load attachment.";
    } finally {
      loading.value = false;
    }
  });

  onScopeDispose(revoke);

  return { url, loading, error };
}
