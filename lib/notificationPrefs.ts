import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const KEY = "notifications_enabled";

/**
 * Push bildirim ac/kapa tercihini kalici saklar.
 * SecureStore web'de calismadigi icin orada localStorage kullanilir.
 */
export async function getNotificationsEnabled(): Promise<boolean> {
  try {
    const value =
      Platform.OS === "web"
        ? window.localStorage.getItem(KEY)
        : await SecureStore.getItemAsync(KEY);
    // Tercih hic kaydedilmemisse bildirimler acik kabul edilir (eski davranis)
    return value === null ? true : value === "1";
  } catch {
    return true;
  }
}

export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  try {
    if (Platform.OS === "web") {
      window.localStorage.setItem(KEY, enabled ? "1" : "0");
      return;
    }
    await SecureStore.setItemAsync(KEY, enabled ? "1" : "0");
  } catch {
    // tercih kaydi kritik degil
  }
}
