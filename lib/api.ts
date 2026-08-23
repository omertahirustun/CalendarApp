import { getSupabase } from "./supabase";
import type { EventRow, TaskRow, TrackedItemRow, Priority, Status } from "./types";

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
  const { error } = await sb
    .from("events")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteEvent(id: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from("events").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Tasks ----------

export async function fetchTasks(userId: string): Promise<TaskRow[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TaskRow[];
}

export type TaskInput = {
  title: string;
  priority: Priority;
  due_date: string | null;
  color: string;
};

export async function createTask(userId: string, input: TaskInput): Promise<TaskRow> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("tasks")
    .insert({ ...input, status: "pending" as Status, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data as TaskRow;
}

export async function updateTask(
  id: string,
  patch: Partial<Pick<TaskRow, "title" | "priority" | "due_date" | "color" | "status">>
): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from("tasks")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTask(id: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Tracked items ----------

export async function fetchTrackedItems(userId: string): Promise<TrackedItemRow[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("tracked_items")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
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
  const { data, error } = await sb
    .from("tracked_items")
    .insert({ ...input, status: "pending" as Status, user_id: userId })
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
