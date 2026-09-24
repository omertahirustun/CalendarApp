// send-daily-summary — her gun sabah 07:00'de pg_cron ile tetiklenir.
// O gun icin planlanmis etkinlikleri bulur; her cihaz token'ina
// gunun ozetini iceren tek bir bildirim gonderir.
//
// Eger kullanicinin bugunku etkinligi yoksa bildirim gonderilmez.
//
// SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY otomatik saglanir.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_CHUNK_SIZE = 100;

// Bu kategorideki etkinlikler gunluk ozete dahil edilmez / bildirim tetiklemez
// (uygulamadaki lib/types.ts SILENT_CATEGORIES ile ayni kaynak; Deno edge
// function bundle'i uygulama kodunu import edemedigi icin burada tekrarlanir)
const SILENT_CATEGORIES = new Set(["availability"]);

interface PushMessage {
  to: string;
  title: string;
  body: string;
  sound: string;
  data: { screen: string };
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, size + i));
  return out;
}

Deno.serve(async (_req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json({ error: "Missing Supabase env vars" }, { status: 500 });
  }

  const sb = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(now);
    dayEnd.setHours(23, 59, 59, 999);

    // Bugunku etkinlikleri bul
    const { data: events, error: evErr } = await sb
      .from("events")
      .select("id, title, start_time, end_time, category, visibility, user_id")
      .gte("start_time", dayStart.toISOString())
      .lte("start_time", dayEnd.toISOString())
      .order("start_time", { ascending: true });
    if (evErr) throw evErr;

    // Musaitlik gibi sessiz kategoriler ozete/bildirime dahil edilmez
    const notifiableEvents = (events ?? []).filter(
      (ev) => !ev.category || !SILENT_CATEGORIES.has(ev.category)
    );

    if (notifiableEvents.length === 0) {
      return Response.json({ ok: true, sent: 0, reason: "no events today" });
    }

    // Kurumsal etkinlikler herkesin ozetinde yer alir; kisisel etkinlikler
    // yalnizca kendi ekleyenin ve katilimcilarin ozetinde yer alir (migration
    // oncesi/beklenmedik null degerler de kurumsal sayilir — kolonun
    // default'uyla tutarli)
    const corporateEvents = notifiableEvents.filter((ev) => ev.visibility !== "personal");
    const personalEvents = notifiableEvents.filter((ev) => ev.visibility === "personal");

    const personalEventIds = personalEvents.map((e) => e.id);
    const attendeesByEvent = new Map<string, string[]>();
    if (personalEventIds.length > 0) {
      const { data: attRows, error: attErr } = await sb
        .from("event_attendees")
        .select("event_id, user_id")
        .in("event_id", personalEventIds);
      if (attErr) throw attErr;
      for (const row of attRows ?? []) {
        const arr = attendeesByEvent.get(row.event_id as string) ?? [];
        arr.push(row.user_id as string);
        attendeesByEvent.set(row.event_id as string, arr);
      }
    }
    function isRelevantToUser(ev: (typeof personalEvents)[number], userId: string): boolean {
      return ev.user_id === userId || (attendeesByEvent.get(ev.id) ?? []).includes(userId);
    }

    // Tum cihaz token'lari, kullanici bazinda gruplu
    const { data: tokenRows, error: tokenErr } = await sb
      .from("device_tokens")
      .select("user_id, push_token");
    if (tokenErr) throw tokenErr;
    const tokensByUser = new Map<string, string[]>();
    for (const row of tokenRows ?? []) {
      const arr = tokensByUser.get(row.user_id as string) ?? [];
      arr.push(row.push_token as string);
      tokensByUser.set(row.user_id as string, arr);
    }

    if (tokensByUser.size === 0) {
      return Response.json({ ok: true, sent: 0, reason: "no tokens" });
    }

    function buildSummaryBody(evs: typeof notifiableEvents): string {
      const count = evs.length;
      const firstTime = new Date(evs[0].start_time).toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const lastTime = new Date(evs[evs.length - 1].start_time).toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return count === 1
        ? `Bugun ${count} etkinligin var. Ilki ${firstTime}de.`
        : `Bugun ${count} etkinligin var (${firstTime} - ${lastTime}).`;
    }

    // Her kullanici icin: tum kurumsal etkinlikler + kendi kisisel etkinlikleri
    const messages: PushMessage[] = [];
    for (const [userId, tokens] of tokensByUser) {
      const merged = [...corporateEvents, ...personalEvents.filter((e) => isRelevantToUser(e, userId))].sort(
        (a, b) => a.start_time.localeCompare(b.start_time)
      );
      if (merged.length === 0) continue;
      const body = buildSummaryBody(merged);
      for (const to of tokens) {
        messages.push({ to, title: "Bugunun plani", body, sound: "default", data: { screen: "/(tabs)" } });
      }
    }

    if (messages.length === 0) {
      return Response.json({ ok: true, sent: 0, reason: "no relevant events for any user" });
    }

    let sentCount = 0;
    const invalidTokens: string[] = [];

    for (const part of chunk(messages, EXPO_CHUNK_SIZE)) {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(part),
      });

      if (!res.ok) {
        console.error(`[expo] HTTP ${res.status}:`, await res.text());
        continue;
      }

      const json = await res.json();
      const tickets = json?.data;
      if (!Array.isArray(tickets)) continue;

      tickets.forEach((ticket: { status: string; details?: { error?: string } }, i: number) => {
        const token = part[i]?.to;
        if (ticket.status === "ok") {
          sentCount++;
        } else if (token && ticket.details?.error === "DeviceNotRegistered") {
          invalidTokens.push(token);
        }
      });
    }

    if (invalidTokens.length > 0) {
      await sb.from("device_tokens").delete().in("push_token", invalidTokens);
    }

    console.log(
      `[send-daily-summary] ${notifiableEvents.length} etkinlik, ${sentCount} bildirim gonderildi, ${invalidTokens.length} olu token silindi.`
    );
    return Response.json({ ok: true, sent: sentCount, events: notifiableEvents.length });
  } catch (err) {
    console.error("[send-daily-summary] kritik hata:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
});
