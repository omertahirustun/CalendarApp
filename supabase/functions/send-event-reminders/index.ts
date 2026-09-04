// send-event-reminders — her dakika cron ile tetiklenir (pg_cron + pg_net).
// Hatirlatilmamis, gelecekteki etkinlikleri bulur:
//   - 10 dakika kalanlara "10 dakika_once" bildirimi
//   - 1 saat kalanlara "1_once" bildirimi
//
// Her iki bildirim turu ayri kolonlarla isaretlenir, boylece ayni etkinlige
// birden fazla farkli bildirim gonderilebilir.
//
// SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY Supabase Edge Functions tarafindan
// otomatik saglanir; service role key RLS'i bypass eder, ASLA client'a koymayin.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_CHUNK_SIZE = 100;

interface ReminderEvent {
  id: string;
  title: string;
  start_time: string;
}

interface PushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

interface PushMessage {
  to: string;
  title: string;
  body: string;
  sound: string;
  data: { eventId: string };
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, size + i));
  return out;
}

async function sendPushBatch(
  sb: ReturnType<typeof createClient>,
  pushTokens: string[],
  messages: PushMessage[]
): Promise<{ sent: number; invalid: string[] }> {
  const invalidTokens: string[] = [];
  let sentCount = 0;
  let httpFailed = false;

  for (const part of chunk(messages, EXPO_CHUNK_SIZE)) {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(part),
    });

    if (!res.ok) {
      console.error(`[expo] HTTP ${res.status}:`, await res.text());
      httpFailed = true;
      continue;
    }

    const json = await res.json();
    const tickets: PushTicket[] | undefined = json?.data;
    if (!Array.isArray(tickets)) {
      console.error("[expo] beklenmeyen yanit:", JSON.stringify(json).slice(0, 300));
      httpFailed = true;
      continue;
    }

    tickets.forEach((ticket, i) => {
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

  return { sent: sentCount, invalid: invalidTokens };
}

Deno.serve(async (_req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[send-event-reminders] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY eksik");
    return Response.json({ error: "Missing Supabase env vars" }, { status: 500 });
  }

  const sb = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    const now = Date.now();
    const nowISO = new Date(now).toISOString();

    const { data: tokenRows, error: tokenErr } = await sb
      .from("device_tokens")
      .select("push_token");
    if (tokenErr) throw tokenErr;
    const pushTokens = (tokenRows ?? []).map((t) => t.push_token as string);

    if (pushTokens.length === 0) {
      return Response.json({ ok: true, sent: 0 });
    }

    // 10 dakika ve 1 saat icinde baslayacak, henuz isaretlenmemis etkinlikler
    const { data: events, error } = await sb
      .from("events")
      .select("id, title, start_time, reminder_1h_sent_at, reminder_10m_sent_at")
      .gte("start_time", nowISO)
      .or("reminder_10m_sent_at.is.null,reminder_1h_sent_at.is.null")
      .order("start_time", { ascending: true })
      .limit(200);
    if (error) throw error;

    let totalSent = 0;

    for (const ev of (events ?? []) as ReminderEvent & {
      reminder_1h_sent_at: string | null;
      reminder_10m_sent_at: string | null;
    }) {
      try {
        const minsLeft = Math.ceil(
          (new Date(ev.start_time).getTime() - now) / 60000
        );

        // 10 dakika hatirlatmasi
        if (minsLeft <= 10 && minsLeft > 0 && !ev.reminder_10m_sent_at) {
          const body = `"${ev.title}" ${minsLeft} dakika icinde basliyor.`;
          const messages: PushMessage[] = pushTokens.map((to) => ({
            to,
            title: "Yaklasan etkinlik",
            body,
            sound: "default",
            data: { eventId: ev.id },
          }));

          const { sent } = await sendPushBatch(sb, pushTokens, messages);
          totalSent += sent;

          const { error: markErr } = await sb
            .from("events")
            .update({ reminder_10m_sent_at: nowISO })
            .eq("id", ev.id);
          if (markErr) throw markErr;
        }

        // 1 saat hatirlatmasi
        if (minsLeft <= 60 && minsLeft > 10 && !ev.reminder_1h_sent_at) {
          const body = `"${ev.title}" 1 saat icinde basliyor.`;
          const messages: PushMessage[] = pushTokens.map((to) => ({
            to,
            title: "Yaklasan etkinlik",
            body,
            sound: "default",
            data: { eventId: ev.id },
          }));

          const { sent } = await sendPushBatch(sb, pushTokens, messages);
          totalSent += sent;

          const { error: markErr } = await sb
            .from("events")
            .update({ reminder_1h_sent_at: nowISO })
            .eq("id", ev.id);
          if (markErr) throw markErr;
        }
      } catch (evErr) {
        console.error(`[event ${ev.id}] islenemedi:`, evErr);
      }
    }

    // Temizlik: baslangici gecmis ama hala isaretsiz etkinlikleri kapat
    const { error: sweepErr } = await sb
      .from("events")
      .update({ reminder_10m_sent_at: nowISO, reminder_1h_sent_at: nowISO })
      .lt("start_time", nowISO)
      .or("reminder_10m_sent_at.is.null,reminder_1h_sent_at.is.null");
    if (sweepErr) throw sweepErr;

    console.log(
      `[send-event-reminders] ${totalSent} bildirim gonderildi.`
    );
    return Response.json({ ok: true, sent: totalSent });
  } catch (err) {
    console.error("[send-event-reminders] kritik hata:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
});
