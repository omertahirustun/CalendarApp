export type Status = "pending" | "completed";

export type EventCategory =
  | "meeting"
  | "project"
  | "payment"
  | "health"
  | "other";

export const EVENT_CATEGORY_META: Record<
  EventCategory,
  { label: string; emoji: string; color: string }
> = {
  meeting: { label: "Toplantı", emoji: "🤝", color: "#2D26F0" },
  project: { label: "Proje", emoji: "📁", color: "#F59E0B" },
  payment: { label: "Ödeme", emoji: "💳", color: "#10B981" },
  health: { label: "Sağlık & Spor", emoji: "💪", color: "#14B8A6" },
  other: { label: "Diğer", emoji: "📌", color: "#6B7280" },
};

export interface EventRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  location: string | null;
  color: string;
  category: EventCategory;
  created_by_name: string | null;
  reminder_sent_at: string | null;
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
  /** DB kolonu nullable; eski kayitlarda null olabilir */
  sort_order: number | null;
  created_at: string;
  updated_at: string;
}

export const PALETTE = [
  "#2D26F0",
  "#6366F1",
  "#3B82F6",
  "#EF4444",
  "#F59E0B",
  "#10B981",
  "#EC4899",
  "#0EA5E9",
] as const;
