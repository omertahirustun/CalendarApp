import { fetchTrackedItems } from "../lib/api";
import { useRealtimeTable } from "./useRealtimeTable";
import type { TrackedItemRow } from "../lib/types";

const sorter = (a: TrackedItemRow, b: TrackedItemRow) => {
  // Kullanicinin surukleyerek belirledigi siralama (sort_order); tik atilan
  // kart yerinde kalir, status degisikligi siralamayi etkilemez.
  // sort_order nullable: null olanlar en sona alinir (NaN kiyaslamasinı onler)
  const ao = a.sort_order ?? Number.MAX_SAFE_INTEGER;
  const bo = b.sort_order ?? Number.MAX_SAFE_INTEGER;
  if (ao !== bo) return ao - bo;
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
};

export function useTrackedItemsRealtime(userId: string | null | undefined) {
  return useRealtimeTable<TrackedItemRow>("tracked_items", userId, fetchTrackedItems, sorter);
}
