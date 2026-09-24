import { getSupabase } from "./supabase";
import type { EventRow, EventCategory, EventVisibility, Profile, TrackedItemRow, Status } from "./types";

// ---------- Events ----------

type EventAttendeeJoinRow = {
  user_id: string;
  profiles: { display_name: string } | { display_name: string }[] | null;
};

function mapEventRow(row: Record<string, unknown>): EventRow {
  const rawAttendees = (row.event_attendees as EventAttendeeJoinRow[] | null) ?? [];
  const attendees = rawAttendees.map((a) => {
    const profile = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
    return { user_id: a.user_id, display_name: profile?.display_name ?? "Bilinmeyen" };
  });
  const { event_attendees, ...rest } = row;
  return { ...rest, attendees } as EventRow;
}

/**
 * Ortak takvim: tum giris yapan kullanicilar tum etkinlikleri gorur.
 * user_id kolonu etkinligi EKLEYEN kisiyi gosterir (created_by_name ile birlikte).
 * Katilimcilar (event_attendees + profiles) ayni sorguda gomulu getirilir.
 */
export async function fetchEvents(): Promise<EventRow[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("events")
    .select("*, event_attendees(user_id, profiles(display_name))")
    .order("start_time", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => mapEventRow(row as Record<string, unknown>));
}

export type EventInput = {
  title: string;
  description?: string | null;
  start_time: string;
  end_time: string;
  location?: string | null;
  color: string;
  category: EventCategory;
  visibility: EventVisibility;
  /** Etkinligi ekleyen kullanicinin adi; sadece create'te yazilir */
  created_by_name: string | null;
  /** Kiminle: katilimci olarak eklenecek kullanicilarin user_id'leri */
  attendee_user_ids: string[];
};

async function replaceAttendees(eventId: string, attendeeUserIds: string[]): Promise<void> {
  const sb = getSupabase();
  const { error: delErr } = await sb.from("event_attendees").delete().eq("event_id", eventId);
  if (delErr) throw delErr;
  if (attendeeUserIds.length === 0) return;
  const { error: insErr } = await sb
    .from("event_attendees")
    .insert(attendeeUserIds.map((user_id) => ({ event_id: eventId, user_id })));
  if (insErr) throw insErr;
}

export async function createEvent(userId: string, input: EventInput): Promise<EventRow> {
  const sb = getSupabase();
  const { attendee_user_ids, ...eventFields } = input;
  const { data, error } = await sb
    .from("events")
    .insert({ ...eventFields, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  if (attendee_user_ids.length > 0) {
    await replaceAttendees(data.id as string, attendee_user_ids);
  }
  return mapEventRow({ ...(data as Record<string, unknown>), event_attendees: [] });
}

export async function updateEvent(id: string, input: EventInput): Promise<void> {
  const sb = getSupabase();
  // created_by_name olusturmada bir kez yazilir; duzenlemede degismesin
  const { created_by_name, attendee_user_ids, ...editable } = input;
  const { error } = await sb
    .from("events")
    .update({ ...editable, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  await replaceAttendees(id, attendee_user_ids);
}

export async function deleteEvent(id: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from("events").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Tracked items ----------

export async function fetchTrackedItems(): Promise<TrackedItemRow[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("tracked_items")
    .select("*")
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

/** Ortak liste: herkes herkesin ogelerini gorur; user_id ekleyeni isaretler */
export async function createTrackedItem(
  userId: string,
  input: TrackedItemInput
): Promise<TrackedItemRow> {
  const sb = getSupabase();
  // Yeni oge listenin en altina eklensin: mevcut en yuksek sort_order + 1
  const { data: maxRow } = await sb
    .from("tracked_items")
    .select("sort_order")
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

// ---------- Profiles (katilimci secicisi icin bilinen kullanicilar) ----------

/** Giris yapan kullanicinin adini profiles tablosuna yazar/gunceller. */
export async function upsertProfile(userId: string, displayName: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from("profiles")
    .upsert({ user_id: userId, display_name: displayName, updated_at: new Date().toISOString() });
  if (error) throw error;
}

/** Katilimci secicisinde listelenecek tum bilinen kullanicilar. */
export async function fetchProfiles(): Promise<Profile[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("profiles")
    .select("user_id, display_name")
    .order("display_name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Profile[];
}

// ---------- Device tokens ----------

export async function saveDeviceToken(userId: string, pushToken: string): Promise<void> {
  const sb = getSupabase();
  // Once guncelle; eski satir yoksa ekle. Composite unique index'e bagimli
  // degil, her senaryoda (index eksikse bile) calisir.
  const { data: updated, error: updErr } = await sb
    .from("device_tokens")
    .update({ push_token: pushToken })
    .eq("user_id", userId)
    .eq("push_token", pushToken)
    .select("user_id");
  if (updErr) throw updErr;
  if (updated && updated.length > 0) return;

  const { error: insErr } = await sb
    .from("device_tokens")
    .insert({ user_id: userId, push_token: pushToken });
  // Ayni anda baska istemci eklediyse mukerrer hatayi yut
  if (insErr && insErr.code !== "23505") throw insErr;
}

/** Kullanicinin tum cihaz token'larini siler; Edge Function artik bu kullaniciya push gonderemez */
export async function deleteDeviceTokens(userId: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from("device_tokens").delete().eq("user_id", userId);
  if (error) throw error;
}
