/**
 * useIssueSelection
 * ─────────────────
 * Shared selection state for the Issues list — every IssueCard reads/writes
 * the same Set so a hover-checkbox in card A keeps card B's selection.
 *
 * Module-level state (not a Pinia store) because selection is ephemeral —
 * resetting on route change is the desired behaviour, and there are no
 * cross-feature consumers that need the store's plugin machinery.
 *
 * Consumers:
 *   • IssueCard          — reads `isSelected(id)`, calls `toggle(id)`
 *   • IssuesBulkBar      — reads `selectedIds`, `count`, `hasSelection`
 *   • route guard        — calls `clear()` when leaving the Issues route
 */
import { computed, reactive } from "vue";

const selected = reactive(new Set<string>());

export function useIssueSelection() {
  function toggle(id: string) {
    if (selected.has(id)) selected.delete(id);
    else                  selected.add(id);
  }
  function add(id: string)         { selected.add(id); }
  function remove(id: string)      { selected.delete(id); }
  function isSelected(id: string)  { return selected.has(id); }
  function clear()                 { selected.clear(); }
  function selectAll(ids: string[]) {
    selected.clear();
    for (const id of ids) selected.add(id);
  }

  const selectedIds  = computed(() => Array.from(selected));
  const count        = computed(() => selected.size);
  const hasSelection = computed(() => selected.size > 0);

  return {
    selected,
    selectedIds,
    count,
    hasSelection,
    toggle,
    add,
    remove,
    isSelected,
    clear,
    selectAll,
  };
}
