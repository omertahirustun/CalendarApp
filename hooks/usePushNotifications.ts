import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import { saveDeviceToken } from "../lib/api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPush(): Promise<string | null> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("reminders", {
      name: "Hatırlatıcılar",
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: "#7C3AED",
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return null;

  try {
    const Constants = require("expo-constants").default;
    const projectId =
      (Constants?.expoConfig?.extra?.eas?.projectId as string | undefined) ??
      (Constants?.easConfig?.projectId as string | undefined);
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
 */
export function usePushNotifications(enabled: boolean) {
  const { userId } = useAuth();

  useEffect(() => {
    if (!enabled || !userId) return;
    let cancelled = false;

    (async () => {
      try {
        // Local hatirlatma izinlerini de bastan iste
        await Notifications.requestPermissionsAsync();

        const token = await registerForPush();
        if (!token || cancelled) return;

        await saveDeviceToken(userId, token);
      } catch {
        // bildirim kaydi kritik degil, sessiz gec
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, userId]);
}

/** Event icin local hatirlatma planla (baslangictan 10 dk once) */
export async function scheduleEventReminder(title: string, startTimeIso: string) {
  try {
    const triggerDate = new Date(new Date(startTimeIso).getTime() - 10 * 60 * 1000);
    if (triggerDate.getTime() <= Date.now()) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Yaklaşan etkinlik",
        body: `"${title}" 10 dakika içinde başlıyor.`,
        color: "#7C3AED",
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
    });
  } catch {
    // yoksay
  }
}
