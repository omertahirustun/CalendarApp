export type Priority = "high" | "medium" | "low";
export type Status = "pending" | "completed";

export interface EventRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  location: string | null;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface TaskRow {
  id: string;
  user_id: string;
  title: string;
  status: Status;
  priority: Priority;
  due_date: string | null;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface TrackedItemRow {
  id: string;
  user_id: string;
  title: string;
  note: string | null;
  link: string | null;
  status: Status;
  color: string;
  created_at: string;
  updated_at: string;
}

export const PALETTE = [
  "#7C3AED",
  "#6366F1",
  "#3B82F6",
  "#EF4444",
  "#F59E0B",
  "#10B981",
  "#EC4899",
  "#0EA5E9",
] as const;

export const PRIORITY_META: Record<Priority, { label: string; color: string; bg: string }> = {
  high: { label: "Yüksek", color: "#EF4444", bg: "rgba(239,68,68,0.12)" },
  medium: { label: "Orta", color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  low: { label: "Düşük", color: "#10B981", bg: "rgba(16,185,129,0.12)" },
};
