/**
 * useIssueEvents
 * ──────────────
 * TanStack Query wrapper over GET /issues/:id/events.
 *
 * Events are append-only on the server (timeline rows from a recording
 * session), so the cache is allowed to live longer than a regular issue
 * fetch — a recording's events don't change once uploaded.
 *
 * Same shape the existing consumers expect:
 *   • events — flat list
 *   • byKind — pre-grouped for the side-panel tabs
 *   • total  — convenience count
 *   • loading / error
 */
import { computed, type Ref } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { api } from "@/shared/lib/api.js";
import type { TimelineEvent } from "@deveprobe/shared";

export interface EventsByKind {
  console:     TimelineEvent[];
  network:     TimelineEvent[];
  error:       TimelineEvent[];
  user_action: TimelineEvent[];
  navigation:  TimelineEvent[];
}

export const issueEventsKey = (id: string) => ["issue", id, "events"] as const;

export function useIssueEvents(issueId: Ref<string>) {
  const query = useQuery({
    queryKey: computed(() => issueEventsKey(issueId.value)),
    enabled:  computed(() => !!issueId.value),
    queryFn:  async (): Promise<TimelineEvent[]> => {
      const res = await api.get(`/issues/${issueId.value}/events`);
      return (res.data.data ?? []) as TimelineEvent[];
    },
    // Recording events are immutable once the session uploads. Keep them
    // in cache for a long time so jumping between issues feels instant.
    staleTime: 10 * 60_000,
    gcTime:    30 * 60_000,
  });

  const events = computed<TimelineEvent[]>(() => query.data.value ?? []);

  const byKind = computed<EventsByKind>(() => ({
    console:     events.value.filter((e) => e.kind === "console"),
    network:     events.value.filter((e) => e.kind === "network"),
    error:       events.value.filter((e) => e.kind === "error"),
    user_action: events.value.filter((e) => e.kind === "user_action"),
    navigation:  events.value.filter((e) => e.kind === "navigation"),
  }));

  const total = computed(() => events.value.length);

  return {
    events,
    byKind,
    total,
    loading: query.isPending,
    error:   computed(() => (query.error.value as Error | null)?.message ?? null),
    refetch: query.refetch,
  };
}
