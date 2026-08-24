import { getSupabase } from "./supabase";
import type { EventRow, EventCategory, TrackedItemRow, Status } from "./types";

// ---------- Events ----------

export async function fetchEvents(userId: string): Promise<EventRow[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("events")
    .select("*")
    .eq("user_id", userId)
    .order("start_time", { ascending: true });
  if (error) throw error;
  return (data ?? []) as EventRow[];
}

export type EventInput = {
  title: string;
  description?: string | null;
  start_time: string;
  end_time: string;
  location?: string | null;
  color: string;
  category: EventCategory;
  /** Etkinligi ekleyen kullanicinin adi; sadece create'te yazilir */
  created_by_name: string | null;
};

export async function createEvent(userId: string, input: EventInput): Promise<EventRow> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("events")
    .insert({ ...input, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data as EventRow;
}

export async function updateEvent(id: string, input: EventInput): Promise<void> {
  const sb = getSupabase();
  // created_by_name olusturmada bir kez yazilir; duzenlemede degismesin
  const { created_by_name, ...editable } = input;
  const { error } = await sb
    .from("events")
    .update({ ...editable, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteEvent(id: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from("events").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Tracked items ----------

export async function fetchTrackedItems(userId: string): Promise<TrackedItemRow[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("tracked_items")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as TrackedItemRow[];
}

export type TrackedItemInput = {
  title: string;
  note?: string | null;
  link?: string | null;
  color: string;
};

export async function createTrackedItem(
  userId: string,
  input: TrackedItemInput
): Promise<TrackedItemRow> {
  const sb = getSupabase();
  // Yeni oge listenin en altina eklensin: mevcut en yuksek sort_order + 1
  const { data: maxRow } = await sb
    .from("tracked_items")
    .select("sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (maxRow?.sort_order ?? -1) + 1;

  const { data, error } = await sb
    .from("tracked_items")
    .insert({
      ...input,
      status: "pending" as Status,
      user_id: userId,
      sort_order: nextOrder,
    })
    .select()
    .single();
  if (error) throw error;
  return data as TrackedItemRow;
}

/** Surukle-birak sonrasi yeni sirayi TEK istekte kaydeder (Postgres rpc) */
export async function reorderTrackedItems(
  userId: string,
  orderedIds: string[]
): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.rpc("reorder_tracked_items", {
    p_user_id: userId,
    p_ids: orderedIds,
  });
  if (error) throw error;
}

export async function updateTrackedItem(
  id: string,
  patch: Partial<Pick<TrackedItemRow, "title" | "note" | "link" | "color" | "status">>
): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from("tracked_items")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTrackedItem(id: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from("tracked_items").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Device tokens ----------

export async function saveDeviceToken(userId: string, pushToken: string): Promise<void> {
  const sb = getSupabase();
  const { data } = await sb
    .from("device_tokens")
    .select("id")
    .eq("user_id", userId)
    .eq("push_token", pushToken)
    .maybeSingle();
  if (data) return;
  const { error } = await sb.from("device_tokens").insert({ user_id: userId, push_token: pushToken });
  if (error) throw error;
}
