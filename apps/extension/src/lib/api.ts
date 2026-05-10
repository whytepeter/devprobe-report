import { API_URL } from "./env.js";
import { getAuth } from "./auth.js";
import type { Issue, Project, Attachment, ApiResponse } from "@deveprobe/shared";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const auth = await getAuth();
  const headers = new Headers(init.headers);
  if (auth?.token) headers.set("Authorization", `Bearer ${auth.token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  const json = (await res.json()) as ApiResponse<T>;
  if (!json.ok) {
    throw new Error(json.error?.message ?? `Request failed: ${res.status}`);
  }
  return json.data;
}

export const api = {
  listProjects: () => request<Project[]>("/projects"),
  createProject: (input: { name: string; slug: string; description?: string }) =>
    request<Project>("/projects", { method: "POST", body: JSON.stringify(input) }),
  createIssue: (input: Record<string, unknown>) =>
    request<Issue>("/issues", { method: "POST", body: JSON.stringify(input) }),
  uploadAttachment: async (params: {
    blob: Blob;
    filename: string;
    type: "screenshot" | "video" | "thumbnail" | "clip" | "export";
    issueId?: string;
    sessionId?: string;
  }) => {
    const form = new FormData();
    form.append("file", params.blob, params.filename);
    form.append("type", params.type);
    if (params.issueId) form.append("issueId", params.issueId);
    if (params.sessionId) form.append("sessionId", params.sessionId);
    return request<Attachment>("/attachments", { method: "POST", body: form });
  },
};
