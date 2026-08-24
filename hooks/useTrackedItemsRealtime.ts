import { fetchTrackedItems } from "../lib/api";
import { useRealtimeTable } from "./useRealtimeTable";
import type { TrackedItemRow } from "../lib/types";

const sorter = (a: TrackedItemRow, b: TrackedItemRow) => {
  // Kullanicinin surukleyerek belirledigi siralama (sort_order); tik atilan
  // kart yerinde kalir, status degisikligi siralamayi etkilemez.
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
};

export function useTrackedItemsRealtime(userId: string | null | undefined) {
  return useRealtimeTable<TrackedItemRow>("tracked_items", userId, fetchTrackedItems, sorter);
}
