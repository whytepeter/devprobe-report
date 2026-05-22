/**
 * useActionsFilter
 * ────────────────
 * The Actions tab shows two event kinds in one stream: `user_action`
 * (clicks/focus/typing/scrolls) and `navigation` (history-API + popstate).
 * They're conceptually the "things the user did" log.
 *
 * Filters:
 *   • text query (substring on summary)
 *   • sort order (latest-first vs earliest-first)
 */
import { computed, ref, type Ref } from "vue";
import type { TimelineEvent } from "@deveprobe/shared";

export type ActionSort = "latest" | "earliest";

export function useActionsFilter(events: Ref<TimelineEvent[]>) {
  const query = ref("");
  const sort  = ref<ActionSort>("latest");

  const filtered = computed<TimelineEvent[]>(() => {
    const q   = query.value.trim().toLowerCase();
    const dir = sort.value === "latest" ? -1 : 1;
    return events.value
      .filter((e) => e.kind === "user_action" || e.kind === "navigation")
      .filter((e) => !q || e.summary.toLowerCase().includes(q))
      .slice()
      .sort((a, b) => (a.timestampMs - b.timestampMs) * dir);
  });

  return { query, sort, filtered };
}
