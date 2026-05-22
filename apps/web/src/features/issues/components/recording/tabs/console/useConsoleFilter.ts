/**
 * useConsoleFilter
 * ────────────────
 * Filters a flat console+network+action event stream down to what the
 * Console tab shows. The tab is the "everything that happened" view, so we
 * also include `error`, `network`, `user_action`, and `navigation` rows —
 * not just console.* — but provide tightly-scoped quick-filters:
 *
 *   • Page navigations  → only `navigation`
 *   • Network errors    → only `network` with status≥400 / 0
 *   • User activity     → only `user_action`
 *
 * Plus a free-text query and a console level selector (all / log / info /
 * warn / error / debug). All filters AND together; an empty query and "all"
 * level + no quick-filter = no filtering at all.
 */
import { computed, ref, type Ref } from "vue";
import type { TimelineEvent } from "@deveprobe/shared";

export type ConsoleLevelFilter = "all" | "log" | "info" | "warn" | "error" | "debug";
export type QuickFilter        = "navigations" | "network-errors" | "user-activity" | null;

export function useConsoleFilter(events: Ref<TimelineEvent[]>) {
  const query = ref("");
  const level = ref<ConsoleLevelFilter>("all");
  const quick = ref<QuickFilter>(null);

  function setQuick(next: QuickFilter) {
    quick.value = quick.value === next ? null : next;
  }

  const filtered = computed<TimelineEvent[]>(() => {
    const q = query.value.trim().toLowerCase();
    return events.value.filter((e) => {
      // Quick filter — exclusive when set.
      if (quick.value === "navigations"    && e.kind !== "navigation") return false;
      if (quick.value === "user-activity"  && e.kind !== "user_action") return false;
      if (quick.value === "network-errors") {
        if (e.kind !== "network") return false;
        const status = (e.data as { status?: number })?.status ?? 0;
        if (!(status === 0 || status >= 400)) return false;
      }

      // Console-level filter — only applies to console rows; non-console
      // rows pass through so the user always sees errors/network/actions
      // even when the level dropdown isn't "all".
      if (level.value !== "all" && e.kind === "console") {
        const lvl = (e.data as { level?: string })?.level;
        if (lvl !== level.value) return false;
      }

      // Free-text search across summary.
      if (q && !e.summary.toLowerCase().includes(q)) return false;

      return true;
    });
  });

  return { query, level, quick, setQuick, filtered };
}
