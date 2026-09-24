import type { WidgetTaskHandlerProps } from "react-native-android-widget";
import { loadWidgetData } from "../lib/widgetData";
import { CalendarWidgetView } from "./CalendarWidgetView";
import { WIDGET_NAME } from "./widgetName";

/**
 * Uygulama kapaliyken/arka plandayken bile OS tarafindan tetiklenen widget
 * lifecycle event'lerini yonetir. Kendi basina network istegi ATMAZ; sadece
 * uygulama en son acikken yazilmis paylasilan ozeti (AsyncStorage) okur.
 */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  if (props.widgetInfo.widgetName !== WIDGET_NAME) return;

  switch (props.widgetAction) {
    case "WIDGET_ADDED":
    case "WIDGET_UPDATE":
    case "WIDGET_RESIZED": {
      const data = await loadWidgetData();
      props.renderWidget(<CalendarWidgetView data={data} width={props.widgetInfo.width} />);
      break;
    }
    case "WIDGET_DELETED":
    case "WIDGET_CLICK":
    default:
      // Dokunma "OPEN_URI" clickAction'i ile dogrudan (JS handler'a ugramadan)
      // arka planda yonetiliyor; burada ek bir islem gerekmiyor.
      break;
  }
}
