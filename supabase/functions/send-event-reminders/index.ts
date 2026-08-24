// send-event-reminders — her dakika cron ile tetiklenir (pg_cron + pg_net).
// Baslangici 10-11 dakika sonra olan, hatirlatilmamis etkinlikleri bulur ve
// kullanicilarin tum kayitli cihazlarina Expo Push API uzerinden bildirim gönderir.
//
// SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY Supabase Edge Functions tarafindan
// otomatik saglanir; service role key RLS'i bypass eder, ASLA client'a koymayin.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_CHUNK_SIZE = 100; // Expo Push API tek istekte en fazla 100 bildirim kabul eder

interface ReminderEvent {
  id: string;
  user_id: string;
  title: string;
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
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

Deno.serve(async (_req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[send-event-reminders] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY eksik");
    return Response.json({ error: "Missing Supabase env vars" }, { status: 500 });
  }

  // Service role key: RLS bypass, admin yetkisi
  const sb = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    // [now+10dk, now+11dk] arasinda baslayan, daha once hatirlatilmamis etkinlikler
    const windowStart = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const windowEnd = new Date(Date.now() + 11 * 60 * 1000).toISOString();

    const { data: events, error } = await sb
      .from("events")
      .select("id, user_id, title")
      .gte("start_time", windowStart)
      .lte("start_time", windowEnd)
      .is("reminder_sent_at", null);

    if (error) throw error;

    if (!events || events.length === 0) {
      return Response.json({ ok: true, processedEvents: 0, sent: 0, removedTokens: 0 });
    }

    let sentCount = 0;
    let removedTokens = 0;

    for (const ev of events as ReminderEvent[]) {
      try {
        // Kullanicinin tum cihaz token'lari (birden fazla cihaz olabilir)
        const { data: tokenRows, error: tokenErr } = await sb
          .from("device_tokens")
          .select("push_token")
          .eq("user_id", ev.user_id);
        if (tokenErr) throw tokenErr;

        const pushTokens = (tokenRows ?? []).map((t) => t.push_token);

        if (pushTokens.length === 0) {
          // Gonderilecek cihaz yok; yine de isaretle ki tekrar islenmesin
          await sb.from("events").update({ reminder_sent_at: new Date().toISOString() }).eq("id", ev.id);
          continue;
        }

        const messages: PushMessage[] = pushTokens.map((to) => ({
          to,
          title: "Yaklaşan etkinlik",
          body: `"${ev.title}" 10 dakika içinde başlıyor.`,
          sound: "default",
          data: { eventId: ev.id },
        }));

        const invalidTokens: string[] = [];
        let sentAny = false;
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
          const tickets: PushTicket[] = json?.data ?? [];

          // Ticket'lar gonderim sirasiyla doner
          tickets.forEach((ticket, i) => {
            const token = part[i].to;
            if (ticket.status === "ok") {
              sentCount++;
              sentAny = true;
            } else if (ticket.details?.error === "DeviceNotRegistered") {
              // Ölü token -> sil
              invalidTokens.push(token);
            } else {
              // MessageTooBig, MessageRateExceeded vb. sadece loglanir
              console.error(
                `[expo] ticket hatasi (${token}): ${ticket.message}`,
                ticket.details ?? ""
              );
            }
          });
        }

        // Ticket bazli yanit alindiysa teslimat durumu kesinlesmistir; sadece
        // hicbir sey gonderilemediyse ve HTTP seviyesinde hata varsa isaretleme ki
        // bir sonraki cron calismasi (10-11 dk penceresi icinde) tekrar denesin.
        if (httpFailed && !sentAny) {
          console.error(`[event ${ev.id}] Expo istegi basarisiz, tekrar denenecek`);
          continue;
        }

        if (invalidTokens.length > 0) {
          const { error: delErr } = await sb
            .from("device_tokens")
            .delete()
            .in("push_token", invalidTokens);
          if (delErr) {
            console.error("[db] ölü token silinemedi:", delErr.message);
          } else {
            removedTokens += invalidTokens.length;
          }
        }

        // Ayni etkinlige iki kez bildirim gitmesin diye isaretle
        const { error: markErr } = await sb
          .from("events")
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq("id", ev.id);
        if (markErr) throw markErr;
      } catch (evErr) {
        // Bir event'teki hata digerlerinin islenmesini engellemesin
        console.error(`[event ${ev.id}] islenemedi:`, evErr);
      }
    }

    console.log(
      `[send-event-reminders] ${events.length} event islendi, ${sentCount} bildirim gonderildi, ${removedTokens} ölü token silindi.`
    );
    return Response.json({
      ok: true,
      processedEvents: events.length,
      sent: sentCount,
      removedTokens,
    });
  } catch (err) {
    console.error("[send-event-reminders] kritik hata:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
});
