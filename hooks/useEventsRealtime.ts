import { fetchEvents } from "../lib/api";
import { useRealtimeTable } from "./useRealtimeTable";
import type { EventRow } from "../lib/types";

const sorter = (a: EventRow, b: EventRow) =>
  new Date(a.start_time).getTime() - new Date(b.start_time).getTime();

export function useEventsRealtime(userId: string | null | undefined) {
  return useRealtimeTable<EventRow>("events", userId, fetchEvents, sorter);
}
