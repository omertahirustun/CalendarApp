// send-event-reminders — her dakika cron ile tetiklenir (pg_cron + pg_net).
// Hatirlatilmamis, gelecekteki etkinlikleri bulur; baslamasina <=10 dakika
// kalanlari tum kayitli cihaz token'larina gonderir.
//
// Guvenlik: gonderim tamamlanamazsa (Expo HTTP hatasi) etkinlik ISARETLENMEZ;
// bir sonraki tick'te tekrar denenir. Etkinlik baslangicini gecmisse ikinci bir
// sorguyla "iskarta" isaretlenir boylece tablo sonsuza dek taranmaz.
//
// SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY Supabase Edge Functions tarafindan
// otomatik saglanir; service role key RLS'i bypass eder, ASLA client'a koymayin.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_CHUNK_SIZE = 100; // Expo Push API tek istekte en fazla 100 bildirim kabul eder
const LEAD_MINUTES = 10; // kalan sure <= bu deger oldugunda bildirim gonderilir

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
    const now = Date.now();

    // Gonderilecek cihaz token'lari — dongunun disinda TEK SEFERDE cekilir (N+1 yok)
    const { data: tokenRows, error: tokenErr } = await sb
      .from("device_tokens")
      .select("push_token");
    if (tokenErr) throw tokenErr;
    const pushTokens = (tokenRows ?? []).map((t) => t.push_token as string);

    let sentCount = 0;
    let removedTokens = 0;
    let processedEvents = 0;

    if (pushTokens.length > 0) {
      // Hatirlatilmamis VE gelecekteki tum etkinlikler; zamanı gelenler asagida elenir
      const { data: events, error } = await sb
        .from("events")
        .select("id, title, start_time")
        .gte("start_time", new Date(now).toISOString())
        .is("reminder_sent_at", null)
        .order("start_time", { ascending: true })
        .limit(200);
      if (error) throw error;

      for (const ev of (events ?? []) as ReminderEvent[]) {
        try {
          const minsLeft = Math.ceil(
            (new Date(ev.start_time).getTime() - now) / 60000
          );
          // Henuz vakti gelmedi; isaretleme ki bir sonraki tick'te tekrar degerlendirilsin
          if (minsLeft > LEAD_MINUTES) continue;
          processedEvents++;

          const body =
            minsLeft >= 1
              ? `"${ev.title}" ${minsLeft} dakika içinde başlıyor.`
              : `"${ev.title}" şu anda başlıyor.`;

          const messages: PushMessage[] = pushTokens.map((to) => ({
            to,
            title: "Yaklaşan etkinlik",
            body,
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
            const tickets: PushTicket[] | undefined = json?.data;
            if (!Array.isArray(tickets)) {
              console.error("[expo] beklenmeyen yanit formati:", JSON.stringify(json).slice(0, 300));
              httpFailed = true;
              continue;
            }

            // Ticket'lar gonderim sirasiyla doner
            tickets.forEach((ticket, i) => {
              const token = part[i]?.to;
              if (ticket.status === "ok") {
                sentCount++;
                sentAny = true;
              } else if (token && ticket.details?.error === "DeviceNotRegistered") {
                invalidTokens.push(token);
              } else {
                console.error(
                  `[expo] ticket hatasi (${token}): ${ticket.message}`,
                  ticket.details ?? ""
                );
              }
            });
          }

          // Tamamen basarisizsa ISARETLEME — bir sonraki dakika tekrar denenir.
          // Etkinlik baslayana kadar deneme devam eder; basladiktan sonra asagidaki
          // temizlik sorgusu isaretleyerek donguden cikarir.
          if (httpFailed && !sentAny) {
            console.error(`[event ${ev.id}] Expo istegi basarisiz, sonraki tick'te tekrar denenecek`);
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
    }

    // Temizlik: baslangici gecmis ama hala isaretsiz etkinlikleri kapat
    // (gonderim hic basarili olamadiysa dahi sonsuza dek taranmasinlar)
    const { error: sweepErr } = await sb
      .from("events")
      .update({ reminder_sent_at: new Date().toISOString() })
      .lt("start_time", new Date().toISOString())
      .is("reminder_sent_at", null);
    if (sweepErr) throw sweepErr;

    console.log(
      `[send-event-reminders] ${processedEvents} event icin tetiklendi, ${sentCount} bildirim gonderildi, ${removedTokens} ölü token silindi.`
    );
    return Response.json({
      ok: true,
      processedEvents,
      sent: sentCount,
      removedTokens,
    });
  } catch (err) {
    console.error("[send-event-reminders] kritik hata:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
});
