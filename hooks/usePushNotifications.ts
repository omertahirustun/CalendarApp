import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { useAuth } from "@clerk/clerk-expo";
import { saveDeviceToken } from "../lib/api";

// Expo Go (SDK 53+) Android'de uzak bildirimler kaldirildi; development build gerekir
const IS_EXPO_GO =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function getEASProjectId(): string | undefined {
  return (
    (Constants?.expoConfig?.extra?.eas?.projectId as string | undefined) ??
    (Constants?.easConfig?.projectId as string | undefined)
  );
}

export type PushRegistration =
  | { ok: true; token: string }
  | { ok: false; reason: "denied" | "expo-go" | "error"; message: string };

export async function registerForPushNotifications(): Promise<PushRegistration> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("reminders", {
      name: "Hatırlatıcılar",
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: "#2D26F0",
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    console.warn("[bildirim] Izin verilmedi:", finalStatus);
    return {
      ok: false,
      reason: "denied",
      message: "Bildirim izni verilmedi. Cihaz ayarlarından izin verin.",
    };
  }

  // Uzak bildirim kaydi Expo Go Android'de mumkun degil; local izin/channel islemleri kalsin
  if (Platform.OS === "android" && IS_EXPO_GO) {
    console.warn(
      "[bildirim] Uzak bildirimler Expo Go'da desteklenmiyor (SDK 53+). " +
        "Push icin development build gerekli: https://docs.expo.dev/develop/development-builds/introduction/"
    );
    return {
      ok: false,
      reason: "expo-go",
      message:
        "Expo Go uzak bildirimleri desteklemiyor. Test için APK (development build) kurun.",
    };
  }

  try {
    const projectId = getEASProjectId();
    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return { ok: true, token: token.data };
  } catch (e) {
    // Android gercek build'lerde en yaygin sebep: Firebase/FCM kimlikleri
    // Expo proje'sine yuklenmemis olmasi (eas credentials).
    console.warn("[bildirim] Token alinamadi:", e);
    return {
      ok: false,
      reason: "error",
      message:
        `Push token alınamadı${e instanceof Error ? `: ${e.message}` : ""}. ` +
        "Android'de genellikle Firebase (FCM) kimliklerinin eksikliğinden olur.",
    };
  }
}

/**
 * Giris yapan kullanicinin push token'ini device_tokens tablosuna kaydeder.
 * Hatirlatmalar sunucu tarafi Edge Function (send-event-reminders) ile gonderilir.
 */
export function usePushNotifications(enabled: boolean) {
  const { userId } = useAuth();

  useEffect(() => {
    if (!enabled || !userId) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await registerForPushNotifications();
        if (!res.ok) {
          console.warn("[bildirim] Kayit atlandi:", res.message);
          return;
        }
        if (cancelled) return;

        await saveDeviceToken(userId, res.token);
        console.log("[bildirim] Token kaydedildi:", userId, res.token);
      } catch (e) {
        // Kayit basarisizsa sebep gorunur olsun
        console.warn("[bildirim] Token kaydi basarisiz:", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, userId]);
}
