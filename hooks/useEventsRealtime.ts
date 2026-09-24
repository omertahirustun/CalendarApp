import { useEffect } from "react";
import { Platform } from "react-native";
import { fetchEvents } from "../lib/api";
import { useRealtimeTable } from "./useRealtimeTable";
import type { EventRow } from "../lib/types";
import { saveWidgetData } from "../lib/widgetData";
import { refreshCalendarWidget } from "../widget/refresh";
import { syncCalendarWidgetIOS } from "../widget/refreshIOS";

const sorter = (a: EventRow, b: EventRow) =>
  new Date(a.start_time).getTime() - new Date(b.start_time).getTime();

export function useEventsRealtime(userId: string | null | undefined) {
  const result = useRealtimeTable<EventRow>("events", userId, fetchEvents, sorter);

  // Ana ekran widget'i: etkinlikler her degistiginde paylasilan ozeti
  // guncelle ve ana ekrana zaten eklenmis widget'lari aninda yeniden ciz.
  // Widget uygulama kapaliyken bu son yazilan ozeti gosterir; network
  // istegi kendisi atmaz. Android ve iOS icin depolama/yenileme mekanizmasi
  // farkli oldugundan (AsyncStorage+headless task vs. App Group+WidgetKit)
  // platforma gore ayriliyor; web'de widget kavrami yok.
  useEffect(() => {
    if (result.loading) return;
    if (Platform.OS === "android") {
      saveWidgetData(result.items)
        .then(() => refreshCalendarWidget())
        .catch(() => {});
    } else if (Platform.OS === "ios") {
      syncCalendarWidgetIOS(result.items).catch(() => {});
    }
  }, [result.items, result.loading]);

  return result;
}
