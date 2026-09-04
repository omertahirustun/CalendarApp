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
      .select("id, title, start_time, end_time, category")
      .gte("start_time", dayStart.toISOString())
      .lte("start_time", dayEnd.toISOString())
      .order("start_time", { ascending: true });
    if (evErr) throw evErr;

    if (!events || events.length === 0) {
      return Response.json({ ok: true, sent: 0, reason: "no events today" });
    }

    // Tum cihaz token'lari
    const { data: tokenRows, error: tokenErr } = await sb
      .from("device_tokens")
      .select("push_token");
    if (tokenErr) throw tokenErr;
    const pushTokens = (tokenRows ?? []).map((t) => t.push_token as string);

    if (pushTokens.length === 0) {
      return Response.json({ ok: true, sent: 0, reason: "no tokens" });
    }

    // Ozet mesaji olustur
    const count = events.length;
    const firstTime = new Date(events[0].start_time).toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const lastTime = new Date(events[events.length - 1].start_time).toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const eventLines = events
      .map((ev) => {
        const time = new Date(ev.start_time).toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
        });
        return `• ${time} — ${ev.title}`;
      })
      .slice(0, 5) // En fazla 5 etkinlik listele
      .join("\n");

    const body =
      count === 1
        ? `Bugun ${count} etkinligin var. Ilki ${firstTime}de.`
        : `Bugun ${count} etkinligin var (${firstTime} - ${lastTime}).`;

    const messages: PushMessage[] = pushTokens.map((to) => ({
      to,
      title: "Bugunun plani",
      body,
      sound: "default",
      data: { screen: "/(tabs)" },
    }));

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
      `[send-daily-summary] ${count} etkinlik, ${sentCount} bildirim gonderildi, ${invalidTokens.length} olu token silindi.`
    );
    return Response.json({ ok: true, sent: sentCount, events: count });
  } catch (err) {
    console.error("[send-daily-summary] kritik hata:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
});
