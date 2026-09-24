import AsyncStorage from "@react-native-async-storage/async-storage";
import type { EventRow } from "./types";
import { formatTime, getMonthMatrix, isSameDay, startOfDay, toISODateString } from "./date";
import { getEventFillColor } from "./eventColor";

/**
 * Ana ekran widget'ina yazilan KUCUK, sadelestirilmis etkinlik ozeti.
 * Widget bu tipi hem uygulama acikken (paylasilan depoya yazarken) hem de
 * uygulama kapaliyken (headless widget task handler okurken) kullanir.
 */
export interface WidgetEventSummary {
  id: string;
  title: string;
  color: string;
  /** ISO tarih (yyyy-mm-dd): etkinligin (izgaraya gore kirpilmis) baslangic gunu */
  date: string;
  /** ISO tarih: cok gunlu etkinliklerde bitis gunu (izgaraya gore kirpilmis); tek gunlukte date ile ayni */
  endDate: string;
  /** "09:00" gibi; tum gun/cok gunlu etkinliklerde null */
  time: string | null;
  /** Etkinlik birden fazla gun mu kapliyor (isim yaniltici olsa da "cok gunlu" anlaminda) */
  allDay: boolean;
}

export interface WidgetData {
  /** Ozetin en son ne zaman hesaplandigi (ISO); widget bunu "en son ... guncellendi" gibi gosterebilir */
  updatedAt: string;
  events: WidgetEventSummary[];
}

const WIDGET_DATA_KEY = "@calendarapp/widget-data";
const WIDGET_MAX_EVENTS = 60;

const EMPTY_WIDGET_DATA: WidgetData = { updatedAt: "", events: [] };

/**
 * Ham etkinlik listesinden widget'a yazilacak kucuk ozeti hesaplar. Aralik,
 * widget'taki ay izgarasinin gosterdigi TUM gunleri (onceki/sonraki ayin
 * tasan gunleri dahil) kapsar ki noktalar tum ay icin dogru olsun. Widget
 * kendi basina network istegi atmadigi icin bu ozet, uygulama en son ne
 * zaman acildiysa o kadar guncel olur.
 */
export function buildWidgetSummary(events: EventRow[]): WidgetData {
  const now = new Date();
  const grid = getMonthMatrix(now);
  const rangeStart = grid[0][0];
  const rangeEnd = grid[grid.length - 1][6];

  const summary: WidgetEventSummary[] = [];
  for (const ev of events) {
    const s = startOfDay(new Date(ev.start_time));
    const e = startOfDay(new Date(ev.end_time));
    if (e < rangeStart || s > rangeEnd) continue;

    // Cok gunlu etkinlik izgaranin gosterdigi araligin disina taşiyorsa, izgaraya
    // gore kirpilir (aksi halde ay gorunumunde hic olmayan bir gune denk gelebilir)
    const displayStart = s < rangeStart ? rangeStart : s;
    const displayEnd = e > rangeEnd ? rangeEnd : e;
    summary.push({
      id: ev.id,
      title: ev.title,
      color: getEventFillColor(ev),
      date: toISODateString(displayStart),
      endDate: toISODateString(displayEnd),
      time: isSameDay(s, e) ? formatTime(ev.start_time) : null,
      allDay: !isSameDay(s, e),
    });
  }

  summary.sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    if (byDate !== 0) return byDate;
    return (a.time ?? "").localeCompare(b.time ?? "");
  });

  return { updatedAt: new Date().toISOString(), events: summary.slice(0, WIDGET_MAX_EVENTS) };
}

/** Ozeti hesaplayip paylasilan depoya (AsyncStorage) yazar. Hata durumunda ana akisi bozmaz. */
export async function saveWidgetData(events: EventRow[]): Promise<void> {
  try {
    const data = buildWidgetSummary(events);
    await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(data));
  } catch {
    // Widget ozeti yazilamadi; ana uygulama akisi bundan etkilenmemeli.
  }
}

/** Widget'in (headless veya foreground) okudugu son ozet. Hic yazilmamissa bos doner. */
export async function loadWidgetData(): Promise<WidgetData> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_DATA_KEY);
    if (!raw) return EMPTY_WIDGET_DATA;
    return JSON.parse(raw) as WidgetData;
  } catch {
    return EMPTY_WIDGET_DATA;
  }
}
