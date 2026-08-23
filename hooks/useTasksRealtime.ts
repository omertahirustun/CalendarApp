import { fetchTasks } from "../lib/api";
import { useRealtimeTable } from "./useRealtimeTable";
import type { TaskRow } from "../lib/types";

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 } as const;

const sorter = (a: TaskRow, b: TaskRow) => {
  // pending once, sonra oncelik, en yeni
  if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
  if (PRIORITY_ORDER[a.priority] !== PRIORITY_ORDER[b.priority])
    return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
};

export function useTasksRealtime(userId: string | null | undefined) {
  return useRealtimeTable<TaskRow>("tasks", userId, fetchTasks, sorter);
}
