import { buildWidgetSummary } from "../lib/widgetData";
import type { EventRow } from "../lib/types";

// app.json ios.entitlements'taki App Group ile ve targets/widget/widgets.swift
// icindeki appGroupId/storageKey sabitleriyle birebir ayni olmali.
const APP_GROUP = "group.com.sezeryanpatates.calendarapp.widget";
const STORAGE_KEY = "widgetData";

/**
 * iOS ana ekran widget'i icin: ozeti (lib/widgetData.ts ile ayni sekilde)
 * hesaplayip App Group'un paylasilan UserDefaults deposuna yazar ve
 * WidgetKit'e yeniden cizim tetikler. Yalnizca iOS'ta cagrilmalidir (cagiran
 * taraf Platform.OS kontrolu yapar).
 *
 * @bacons/apple-targets native modulu henuz prebuild/EAS build edilmemis bir
 * gelistirme ortaminda (orn. Expo Go) yoksa paket sessizce no-op'a duser;
 * bu fonksiyon da try/catch ile sarilip cagiran tarafta yutulur.
 */
export async function syncCalendarWidgetIOS(events: EventRow[]): Promise<void> {
  const { ExtensionStorage } = await import("@bacons/apple-targets");
  const data = buildWidgetSummary(events);
  const storage = new ExtensionStorage(APP_GROUP);
  storage.set(STORAGE_KEY, JSON.stringify(data));
  ExtensionStorage.reloadWidget();
}
