/**
 * useConsoleGrouping
 * ──────────────────
 * Collapses consecutive identical console rows into a single row with a
 * repeat count (spec §159 "Collapse noisy entries") — the common case of a
 * component logging the same message in a tight loop.
 *
 * Two rows collapse when they share the same kind, summary, and console level.
 * The FIRST occurrence is kept (so seeking jumps to when it started) and its
 * `repeatCount` is incremented for each suppressed duplicate.
 */
import { computed, type Ref } from "vue";
import type { TimelineEvent } from "@deveprobe/shared";

export interface GroupedRow {
  event:       TimelineEvent;
  repeatCount: number;
}

function levelOf(e: TimelineEvent): string {
  return (e.data as { level?: string })?.level ?? "";
}

export function useConsoleGrouping(events: Ref<TimelineEvent[]>) {
  return computed<GroupedRow[]>(() => {
    const out: GroupedRow[] = [];
    for (const event of events.value) {
      const prev = out[out.length - 1];
      if (
        prev &&
        prev.event.kind === event.kind &&
        prev.event.summary === event.summary &&
        levelOf(prev.event) === levelOf(event)
      ) {
        prev.repeatCount++;
        continue;
      }
      out.push({ event, repeatCount: 1 });
    }
    return out;
  });
}
