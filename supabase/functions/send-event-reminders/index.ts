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

// Bu kategorideki etkinlikler icin hatirlatma bildirimi gonderilmez
// (uygulamadaki lib/types.ts SILENT_CATEGORIES ile ayni kaynak; Deno edge
// function bundle'i uygulama kodunu import edemedigi icin burada tekrarlanir)
const SILENT_CATEGORIES = new Set(["availability"]);

interface ReminderEvent {
  id: string;
  title: string;
  start_time: string;
  category: string | null;
  visibility: string | null;
  user_id: string;
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

/**
 * Bir hatirlatma kolonunu (reminder_10m_sent_at / reminder_1h_sent_at) atomik
 * olarak "isaretlenmemisse isaretle" seklinde gunceller (UPDATE ... WHERE col
 * IS NULL). Postgres ayni satir uzerindeki eszamanli UPDATE'leri sira ile
 * calistirdigi icin, cron'un art arda iki calismasi ust uste binse bile
 * (ornegin push gonderimi 60sn'yi asip bir sonraki dakikanin tetiklemesiyle
 * cakisirsa) sadece BIRI satiri "kazanir" ve gercekten push gonderir; digeri
 * 0 satir gunceller ve gondermeden geçer. Bu, ayni etkinlige cift bildirim
 * gitmesini (mark-after-send yaklasiminda olusan yaris durumunu) onler.
 */
async function claimReminder(
  sb: ReturnType<typeof createClient>,
  eventId: string,
  column: "reminder_10m_sent_at" | "reminder_1h_sent_at",
  nowISO: string
): Promise<boolean> {
  const { data, error } = await sb
    .from("events")
    .update({ [column]: nowISO })
    .eq("id", eventId)
    .is(column, null)
    .select("id");
  if (error) throw error;
  return Array.isArray(data) && data.length > 0;
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
      .select("user_id, push_token");
    if (tokenErr) throw tokenErr;
    const allTokens = (tokenRows ?? []).map((t) => t.push_token as string);
    // Kisisel etkinliklerde hatirlatma yalnizca ekleyen kisinin cihazlarina gider
    const tokensByUser = new Map<string, string[]>();
    for (const row of tokenRows ?? []) {
      const arr = tokensByUser.get(row.user_id as string) ?? [];
      arr.push(row.push_token as string);
      tokensByUser.set(row.user_id as string, arr);
    }

    if (allTokens.length === 0) {
      return Response.json({ ok: true, sent: 0 });
    }

    // 10 dakika ve 1 saat icinde baslayacak, henuz isaretlenmemis etkinlikler
    const { data: events, error } = await sb
      .from("events")
      .select("id, title, start_time, category, visibility, user_id, reminder_1h_sent_at, reminder_10m_sent_at")
      .gte("start_time", nowISO)
      .or("reminder_10m_sent_at.is.null,reminder_1h_sent_at.is.null")
      .order("start_time", { ascending: true })
      .limit(200);
    if (error) throw error;

    // Kisisel etkinliklerin katilimcilari: hatirlatma ekleyen kisi disinda
    // katilimci olarak eklenen kullanicilara da gider
    const personalEventIds = (events ?? [])
      .filter((e) => e.visibility === "personal")
      .map((e) => e.id as string);
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

    let totalSent = 0;

    for (const ev of (events ?? []) as ReminderEvent & {
      reminder_1h_sent_at: string | null;
      reminder_10m_sent_at: string | null;
    }) {
      try {
        const minsLeft = Math.ceil(
          (new Date(ev.start_time).getTime() - now) / 60000
        );
        // Musaitlik gibi "sessiz" kategorilerde push gonderilmez; yine de
        // sent_at isaretlenir ki her dakika ayni etkinlik yeniden islenmesin
        const silent = !!ev.category && SILENT_CATEGORIES.has(ev.category);
        // Kisisel etkinlik: sadece ekleyen kisi + katilimcilara; kurumsal: herkese (mevcut davranis)
        const targets =
          ev.visibility === "personal"
            ? Array.from(
                new Set(
                  [ev.user_id, ...(attendeesByEvent.get(ev.id) ?? [])].flatMap(
                    (uid) => tokensByUser.get(uid) ?? []
                  )
                )
              )
            : allTokens;

        // 10 dakika hatirlatmasi — once atomik claim, sadece kazanirsak gonder
        if (minsLeft <= 10 && minsLeft > 0 && !ev.reminder_10m_sent_at) {
          const claimed = await claimReminder(sb, ev.id, "reminder_10m_sent_at", nowISO);
          if (claimed && !silent && targets.length > 0) {
            const body = `"${ev.title}" ${minsLeft} dakika icinde basliyor.`;
            const messages: PushMessage[] = targets.map((to) => ({
              to,
              title: "Yaklasan etkinlik",
              body,
              sound: "default",
              data: { eventId: ev.id },
            }));

            const { sent } = await sendPushBatch(sb, targets, messages);
            totalSent += sent;
          }
        }

        // 1 saat hatirlatmasi — once atomik claim, sadece kazanirsak gonder
        if (minsLeft <= 60 && minsLeft > 10 && !ev.reminder_1h_sent_at) {
          const claimed = await claimReminder(sb, ev.id, "reminder_1h_sent_at", nowISO);
          if (claimed && !silent && targets.length > 0) {
            const body = `"${ev.title}" 1 saat icinde basliyor.`;
            const messages: PushMessage[] = targets.map((to) => ({
              to,
              title: "Yaklasan etkinlik",
              body,
              sound: "default",
              data: { eventId: ev.id },
            }));

            const { sent } = await sendPushBatch(sb, targets, messages);
            totalSent += sent;
          }
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
