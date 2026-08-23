import { fetchTrackedItems } from "../lib/api";
import { useRealtimeTable } from "./useRealtimeTable";
import type { TrackedItemRow } from "../lib/types";

const sorter = (a: TrackedItemRow, b: TrackedItemRow) => {
  if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
};

export function useTrackedItemsRealtime(userId: string | null | undefined) {
  return useRealtimeTable<TrackedItemRow>("tracked_items", userId, fetchTrackedItems, sorter);
}
