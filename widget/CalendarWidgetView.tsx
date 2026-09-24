import * as React from "react";
import { FlexWidget, TextWidget } from "react-native-android-widget";
import { contrastTextColor } from "../lib/color";
import {
  addDays,
  daysBetween,
  getMonthMatrix,
  isSameMonth,
  MONTHS_TR,
  parseISODateString,
  toISODateString,
  WEEKDAYS_TR,
} from "../lib/date";
import type { WidgetData, WidgetEventSummary } from "../lib/widgetData";
import { COLORS } from "../lib/theme";

// Uygulamadaki CalendarGrid.tsx ile ortak renk kaynagi (lib/theme.ts) — iki
// dosyanin elle senkron tutulan hex kodlarina bagli kalmamasi icin
const PRIMARY = COLORS.primary;
// Android widget'lari (react-native-android-widget) native bir blur/RenderEffect
// API'si sunmuyor — Samsung One UI'daki widget arka plan bulanikligi launcher
// seviyesinde (Good Lock/Home ayari) uygulanir, widget icerigi tarafindan
// tetiklenemez. Bu yuzden burada opak, duz beyaz bir kart kullaniyoruz;
// bulanik cam hissi vermenin bu kutuphaneyle mumkun olan en yakini bu.
const BG = "#FFFFFF";
const BORDER = COLORS.border;
const MUTED = COLORS.muted;
const TEXT = COLORS.text;
const TODAY_BG = COLORS.todayBg;
// Haftasonu gun numarasi metni (Samsung Takvim'deki gibi) — hucre arka plani
// artik degismiyor, sadece rakamin rengi kirmizi oluyor
const WEEKEND_TEXT = "#DC2626";
// Onceki/sonraki ayin soluk gun numarasi rengi
const OUT_OF_MONTH_TEXT = "#D1D5DB";
// Etkinlik cubuklarinin sabit yuksekligi: hem cok gunlu cubuk hem tek gunluk
// etkinlik kutusu ayni boyda olsun diye (icerige gore buyuyup kuculmesin)
const EVENT_BAR_HEIGHT = 17;
const EVENT_BAR_FONT_SIZE = 10;
// Etkinlik kutularinin hucre kenarlarindan birakacagi bosluk (tek gunlukte
// her iki yanda; cok gunlu cubukta yalnizca gercek baslangic/bitis gununde)
const EVENT_SIDE_GAP = 3;
// Etkinlik renklerini beyaza dogru hafifce harmanlayarak "hafif seffaf" gorunum
// verir (native widget renderer'i RRGGBBAA hex'i guvenilir parse etmeyebildigi
// icin gercek alpha yerine opak, acik bir renk hesaplaniyor — asagidaki
// fadeTowardWhite yorumuna bakin)
const EVENT_COLOR_OPACITY = 0.82;
// Bir gun hucresinde en fazla kac etkinlik gosterilsin (cok gunlu cubuk +
// tek gunluk etkinlikler dahil toplam; yer sinirli). Fazlasi icin "+N" ozeti
// gosterilir. Uygulamadaki MAX_VISIBLE_CHIPS ile ayni.
const MAX_EVENTS_PER_CELL = 3;

/**
 * Rengi beyaza dogru soldurur. Native widget renderer'i RN'nin kendi renk
 * ayristiricisindan farkli olabilecegi icin (trailing-alpha hex yerine)
 * dogrudan opak, acik bir renk hesaplar — onceki/sonraki ay etkinlikleri icin.
 */
function fadeTowardWhite(hex: string, amount: number): `#${string}` {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const mix = (c: number) => Math.round(255 - (255 - c) * amount);
  const toHex = (c: number) => c.toString(16).padStart(2, "0");
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}

/**
 * Bir etkinlik kutusunda kullanilacak nihai rengi hesaplar: her zaman hafifce
 * seffaflastirilir (EVENT_COLOR_OPACITY), onceki/sonraki ay gunlerinde ise
 * daha da soluk gorunmesi icin ekstra soldurulur.
 */
function eventDisplayColor(hex: string, fadeOutOfMonth: boolean): `#${string}` {
  return fadeTowardWhite(hex, fadeOutOfMonth ? 0.35 : EVENT_COLOR_OPACITY);
}

interface DaySpan {
  event: WidgetEventSummary;
  isStart: boolean;
  isEnd: boolean;
  showTitle: boolean;
}

/**
 * Cok gunlu etkinliklerin her gununu, o gunun bu etkinligin gercek
 * baslangici/bitisi/orta gunu olup olmadigi bilgisiyle esler. Widget'ta her
 * gun hucresi bagimsiz cizildigi icin (uygulamadaki gibi tek bir "bar"
 * elemani yerine), bitisik hucrelerin kenarlari yuvarlatilmayinca aradaki
 * cizgi kaybolup kesintisiz tek bir cubuk gibi gorunur.
 */
function buildMultiDaySpans(events: WidgetEventSummary[]): Map<string, DaySpan> {
  const map = new Map<string, DaySpan>();
  for (const ev of events) {
    if (!ev.allDay) continue;
    const start = parseISODateString(ev.date);
    const end = parseISODateString(ev.endDate);
    if (end.getTime() < start.getTime()) continue;
    const totalDays = daysBetween(start, end);
    const middleIso = toISODateString(addDays(start, Math.floor((totalDays - 1) / 2)));

    let cursor = start;
    while (cursor.getTime() <= end.getTime()) {
      const iso = toISODateString(cursor);
      if (!map.has(iso)) {
        map.set(iso, {
          event: ev,
          isStart: iso === ev.date,
          isEnd: iso === ev.endDate,
          showTitle: iso === middleIso,
        });
      }
      cursor = addDays(cursor, 1);
    }
  }
  return map;
}

/** Genislik esigi: bunun altinda "kucuk" (bugun/yaklasan liste), ustunde "orta/buyuk" (ay izgarasi) duzen kullanilir. */
const COMPACT_WIDTH_THRESHOLD = 220;

function todayISODate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Dokununca uygulamayi Takvim ekranina, mumkunse ilgili gune deep-link ile acar. */
function deepLinkForDate(date: string): string {
  return `calendarapp://?date=${date}`;
}

function EventRow({ event }: { event: WidgetEventSummary }) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: deepLinkForDate(event.date) }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        width: "match_parent",
        marginBottom: 3,
      }}
    >
      <FlexWidget
        style={{
          width: 7,
          height: 7,
          borderRadius: 4,
          backgroundColor: event.color as `#${string}`,
          marginRight: 6,
        }}
      />
      <FlexWidget style={{ flex: 1 }}>
        <TextWidget
          text={event.title}
          truncate="END"
          maxLines={1}
          style={{ fontSize: 12, color: TEXT, width: "match_parent" }}
        />
      </FlexWidget>
      {event.time && (
        <TextWidget text={event.time} style={{ fontSize: 10, color: MUTED, marginLeft: 4 }} />
      )}
    </FlexWidget>
  );
}

/** Kucuk boyut icin: bugunun (bossa yaklasan) etkinliklerinin kisa listesi. */
function TodayList({ data }: { data: WidgetData }) {
  const today = todayISODate();
  const todaysEvents = data.events.filter((e) => e.date === today);
  const upcomingEvents = data.events.filter((e) => e.date !== today);
  const noneAtAll = data.events.length === 0;
  const hasToday = todaysEvents.length > 0;
  const rows = (hasToday ? todaysEvents : upcomingEvents).slice(0, 3);

  return (
    <FlexWidget style={{ flexDirection: "column", width: "match_parent" }}>
      {noneAtAll && <TextWidget text="Etkinlik yok" style={{ fontSize: 12, color: MUTED }} />}
      {!noneAtAll && !hasToday && (
        <TextWidget text="Bugün etkinlik yok · yaklaşan:" style={{ fontSize: 10, color: MUTED, marginBottom: 3 }} />
      )}
      {rows.map((ev) => (
        <EventRow key={ev.id} event={ev} />
      ))}
    </FlexWidget>
  );
}

/** Orta/buyuk boyut icin: gercek ay izgarasi (hafta sonu grisi + hafta basliklari + gun numaralari + etkinlikler). */
function MonthGrid({ data }: { data: WidgetData }) {
  const monthDate = new Date();
  const weeks = getMonthMatrix(monthDate);
  const todayIso = todayISODate();

  const spanByDate = buildMultiDaySpans(data.events);
  // Tek gunluk etkinlikler: o gune ait TUM etkinlikler (yalnizca ilki degil),
  // hucrede kucuk birer "chip" olarak alt alta gosterilir
  const singleByDate = new Map<string, WidgetEventSummary[]>();
  for (const ev of data.events) {
    if (ev.allDay) continue;
    const list = singleByDate.get(ev.date);
    if (list) list.push(ev);
    else singleByDate.set(ev.date, [ev]);
  }

  return (
    <FlexWidget style={{ flexDirection: "column", width: "match_parent", flex: 1 }}>
      <FlexWidget style={{ flexDirection: "row", width: "match_parent", marginBottom: 2 }}>
        {WEEKDAYS_TR.map((label, i) => (
          <FlexWidget key={i} style={{ flex: 1, alignItems: "center" }}>
            <TextWidget text={label} style={{ fontSize: 12, fontWeight: "700", color: MUTED }} />
          </FlexWidget>
        ))}
      </FlexWidget>

      {weeks.map((week, wi) => (
        <FlexWidget
          key={wi}
          style={{
            flexDirection: "row",
            width: "match_parent",
            flex: 1,
            // Samsung Takvim'deki gibi hafta satirlari arasinda ince gri
            // ayrac (son satirda cizgiye gerek yok)
            borderBottomWidth: wi < weeks.length - 1 ? 1 : 0,
            borderBottomColor: BORDER,
          }}
        >
          {week.map((day) => {
            const iso = toISODateString(day);
            const inMonth = isSameMonth(day, monthDate);
            const isToday = iso === todayIso;
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            const span = spanByDate.get(iso);
            // Cok gunlu cubuk (span) o gun icin 1 "slot" kaplar; kalan slotlar
            // tek gunluk etkinliklere ayrilir. Onceden span varken tum tek
            // gunluk etkinlikler tamamen gizleniyordu — artik ikisi birlikte gosterilir.
            const singleEvents = singleByDate.get(iso) ?? [];
            const remainingSlots = span ? MAX_EVENTS_PER_CELL - 1 : MAX_EVENTS_PER_CELL;
            const visibleSingleEvents = singleEvents.slice(0, remainingSlots);
            const hiddenSingleCount = Math.max(singleEvents.length - remainingSlots, 0);
            const fade = !inMonth;

            // Hucre arka plani artik hafta sonu/disi-ay icin degismiyor —
            // sadece bugun vurgusu kaliyor, geri kalani haftaici beyazi
            const cellBg: `#${string}` | undefined = isToday ? TODAY_BG : undefined;
            // Gun numarasi rengi: disi-ay > haftasonu (kirmizi) > normal
            const dayTextColor = !inMonth ? OUT_OF_MONTH_TEXT : isWeekend ? WEEKEND_TEXT : TEXT;

            return (
              <FlexWidget
                key={iso}
                clickAction="OPEN_URI"
                clickActionData={{ uri: deepLinkForDate(iso) }}
                style={{
                  flex: 1,
                  height: "match_parent",
                  flexDirection: "column",
                  alignItems: "center",
                  paddingTop: 2,
                  backgroundColor: cellBg,
                }}
              >
                <TextWidget
                  text={String(day.getDate())}
                  style={{
                    fontSize: 13,
                    fontWeight: isToday ? "900" : "700",
                    color: dayTextColor,
                    width: 20,
                    height: 20,
                    textAlign: "center",
                  }}
                />

                {span && (
                  <FlexWidget
                    style={{
                      width: "match_parent",
                      height: EVENT_BAR_HEIGHT,
                      justifyContent: "center",
                      backgroundColor: eventDisplayColor(span.event.color, fade),
                      marginTop: 2,
                      // Cubuk sadece gercek baslangic gununde soldan, gercek
                      // bitis gununde sagdan bosluk birakir; aradaki gunlerde
                      // kenardan kenara uzanip kesintisiz tek parca gibi durur
                      marginLeft: span.isStart ? EVENT_SIDE_GAP : 0,
                      marginRight: span.isEnd ? EVENT_SIDE_GAP : 0,
                      borderTopLeftRadius: span.isStart ? 3 : 0,
                      borderBottomLeftRadius: span.isStart ? 3 : 0,
                      borderTopRightRadius: span.isEnd ? 3 : 0,
                      borderBottomRightRadius: span.isEnd ? 3 : 0,
                    }}
                  >
                    {span.showTitle && (
                      <TextWidget
                        text={span.event.title}
                        truncate="END"
                        maxLines={1}
                        style={{
                          fontSize: EVENT_BAR_FONT_SIZE,
                          color: contrastTextColor(eventDisplayColor(span.event.color, fade)) as `#${string}`,
                          width: "match_parent",
                          textAlign: "center",
                        }}
                      />
                    )}
                  </FlexWidget>
                )}

                {visibleSingleEvents.map((ev) => (
                  <FlexWidget
                    key={ev.id}
                    style={{
                      width: "match_parent",
                      height: EVENT_BAR_HEIGHT,
                      justifyContent: "center",
                      backgroundColor: eventDisplayColor(ev.color, fade),
                      borderRadius: 3,
                      marginTop: 2,
                      marginHorizontal: EVENT_SIDE_GAP,
                      paddingHorizontal: 2,
                    }}
                  >
                    <TextWidget
                      text={ev.title}
                      truncate="END"
                      maxLines={1}
                      style={{
                        fontSize: EVENT_BAR_FONT_SIZE,
                        color: contrastTextColor(eventDisplayColor(ev.color, fade)) as `#${string}`,
                        width: "match_parent",
                        textAlign: "center",
                      }}
                    />
                  </FlexWidget>
                ))}

                {hiddenSingleCount > 0 && (
                  <TextWidget
                    text={`+${hiddenSingleCount}`}
                    style={{ fontSize: 8, color: MUTED, marginTop: 1 }}
                  />
                )}
              </FlexWidget>
            );
          })}
        </FlexWidget>
      ))}
    </FlexWidget>
  );
}

export function CalendarWidgetView({ data, width }: { data: WidgetData; width: number }) {
  const compact = width < COMPACT_WIDTH_THRESHOLD;
  const now = new Date();

  return (
    <FlexWidget
      clickAction={compact ? "OPEN_URI" : undefined}
      clickActionData={compact ? { uri: deepLinkForDate(todayISODate()) } : undefined}
      style={{
        height: "match_parent",
        width: "match_parent",
        backgroundColor: BG,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: BORDER,
        padding: 12,
        flexDirection: "column",
      }}
    >
      <FlexWidget style={{ flexDirection: "column", alignItems: "center", width: "match_parent", marginBottom: 6 }}>
        <TextWidget
          text="Adezyon"
          style={{ fontSize: 20, fontWeight: "900", color: PRIMARY, textAlign: "center", width: "match_parent" }}
        />
        <TextWidget
          text={`${MONTHS_TR[now.getMonth()]} ${now.getFullYear()}`}
          style={{ fontSize: 11, fontWeight: "600", color: MUTED, textAlign: "center", width: "match_parent" }}
        />
      </FlexWidget>

      {compact ? <TodayList data={data} /> : <MonthGrid data={data} />}
    </FlexWidget>
  );
}
