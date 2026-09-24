export type Status = "pending" | "completed";

export type EventCategory = "meeting" | "project" | "payment" | "shoot" | "delivery" | "availability" | "reminder" | "other";

export type EventVisibility = "personal" | "corporate";

export const EVENT_VISIBILITY_META: Record<EventVisibility, { label: string }> = {
    personal: { label: "Kişisel" },
    corporate: { label: "Kurumsal" },
};

/** Bildirim gonderilmemesi gereken kategoriler (ornegin musaitlik etkinlikleri sessiz kalir) */
export const SILENT_CATEGORIES: readonly EventCategory[] = ["availability"];

export const EVENT_CATEGORY_META: Record<EventCategory, { label: string; emoji: string; color: string }> = {
    meeting: { label: "Toplantı", emoji: "🤝", color: "#2D26F0" },
    project: { label: "Proje", emoji: "📁", color: "#F59E0B" },
    payment: { label: "Ödeme", emoji: "💳", color: "#10B981" },
    shoot: { label: "Çekim", emoji: "🎬", color: "#EF4444" },
    delivery: { label: "Teslim", emoji: "📦", color: "#22C55E" },
    availability: { label: "Müsaitlik", emoji: "🙋", color: "#9CA3AF" },
    reminder: { label: "Hatırlatma", emoji: "⏰", color: "#8B5CF6" },
    other: { label: "Diğer", emoji: "📌", color: "#6B7280" },
};

export interface Profile {
    user_id: string;
    display_name: string;
}

export interface EventAttendee {
    user_id: string;
    display_name: string;
}

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
    visibility: EventVisibility;
    created_by_name: string | null;
    reminder_sent_at: string | null;
    created_at: string;
    updated_at: string;
    /** Kiminle: katilimci listesi (fetchEvents ile birlikte doldurulur) */
    attendees: EventAttendee[];
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
    "#808080",
] as const;
