import type { Check } from "./status";
import type { ChecklistItem } from "./types";

export function childrenOf(items: ChecklistItem[], parentId: string) {
  return items.filter((i) => i.parentId === parentId);
}

/** Leaf-weighted completion (parents count through their children). */
export function checklistProgress(items: ChecklistItem[]): { done: number; total: number; pct: number } {
  const leaves = items.filter((i) => !items.some((c) => c.parentId === i.id));
  const done = leaves.filter((i) => i.done).length;
  return { done, total: leaves.length, pct: leaves.length ? Math.round((done / leaves.length) * 100) : 0 };
}

export function canToggle(items: ChecklistItem[], itemId: string, done: boolean): Check {
  const item = items.find((i) => i.id === itemId);
  if (!item) return { ok: false, reason: "Checklist item not found." };
  if (done) {
    const open = childrenOf(items, itemId).filter((c) => !c.done);
    if (open.length) return { ok: false, reason: `Complete ${open.length} sub-step(s) first.` };
  }
  return { ok: true };
}

/**
 * Returns the ids whose `done` must change when `itemId` is toggled:
 * the item itself, plus ancestors that become complete/incomplete.
 */
export function toggleEffects(items: ChecklistItem[], itemId: string, done: boolean): { id: string; done: boolean }[] {
  const state = new Map(items.map((i) => [i.id, i.done]));
  state.set(itemId, done);
  const changes = [{ id: itemId, done }];
  let parentId = items.find((i) => i.id === itemId)?.parentId ?? null;
  while (parentId) {
    const siblings = childrenOf(items, parentId);
    const all = siblings.every((s) => state.get(s.id));
    if (state.get(parentId) !== all) {
      state.set(parentId, all);
      changes.push({ id: parentId, done: all });
    }
    parentId = items.find((i) => i.id === parentId)?.parentId ?? null;
  }
  return changes;
}

/** First incomplete leaf in display order — drives "Continue working". */
export function nextIncomplete(items: ChecklistItem[]): ChecklistItem | null {
  const ordered = orderTree(items);
  return ordered.find((i) => !i.done && !items.some((c) => c.parentId === i.id)) ?? null;
}

export function orderTree(items: ChecklistItem[]): ChecklistItem[] {
  const out: ChecklistItem[] = [];
  const walk = (parent: string | null) => {
    for (const i of items.filter((x) => x.parentId === parent).sort((a, b) => a.order - b.order)) {
      out.push(i);
      walk(i.id);
    }
  };
  walk(null);
  return out;
}
