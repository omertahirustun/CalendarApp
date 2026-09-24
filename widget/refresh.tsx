import { requestWidgetUpdate } from "react-native-android-widget";
import { loadWidgetData } from "../lib/widgetData";
import { CalendarWidgetView } from "./CalendarWidgetView";
import { WIDGET_NAME } from "./widgetName";

/**
 * Uygulama acikken (ozet AsyncStorage'a yeni yazildiktan hemen sonra) ana
 * ekrana zaten eklenmis widget'lari aninda yeniden cizdirir. Yalnizca Android'de
 * cagrilmalidir (cagiran taraf Platform.OS kontrolu yapar).
 */
export async function refreshCalendarWidget(): Promise<void> {
  await requestWidgetUpdate({
    widgetName: WIDGET_NAME,
    renderWidget: async (widgetInfo) => {
      const data = await loadWidgetData();
      return <CalendarWidgetView data={data} width={widgetInfo.width} />;
    },
  });
}
