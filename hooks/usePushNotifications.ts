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

export async function registerForPushNotifications(): Promise<string | null> {
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
  if (finalStatus !== "granted") return null;

  // Uzak bildirim kaydi Expo Go Android'de mumkun degil; local izin/channel islemleri kalsin
  if (Platform.OS === "android" && IS_EXPO_GO) {
    console.warn(
      "[bildirim] Uzak bildirimler Expo Go'da desteklenmiyor (SDK 53+). " +
        "Push icin development build gerekli: https://docs.expo.dev/develop/development-builds/introduction/"
    );
    return null;
  }

  try {
    const projectId = getEASProjectId();
    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return token.data;
  } catch {
    return null;
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
      const token = await registerForPushNotifications();
      if (!token || cancelled) return;

      await saveDeviceToken(userId, token);
      console.log("[bildirim] Token kaydedildi:", userId, token);
    } catch (e) {
      // Kayit basarisizsa sebep gorunur olsun (sessiz yutma yerine)
      console.warn("[bildirim] Token kaydi basarisiz:", e);
    }
  })();

    return () => {
      cancelled = true;
    };
  }, [enabled, userId]);
}
