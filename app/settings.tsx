import { useEffect, useState } from "react";
import { View, Text, Pressable, Switch, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { ChevronLeft, LogOut, BellRing } from "lucide-react-native";

import {
  getNotificationsEnabled,
  setNotificationsEnabled,
} from "../lib/notificationPrefs";
import { deleteDeviceTokens, saveDeviceToken } from "../lib/api";
import { registerForPushNotifications } from "../hooks/usePushNotifications";

export default function SettingsScreen() {
  const router = useRouter();
  const { userId, signOut } = useAuth();
  const { user } = useUser();

  // null = tercihen yukleniyor (Switch o arada kapali gorunsun)
  const [notifEnabled, setNotifEnabled] = useState<boolean | null>(null);
  // Toggle islemi surerken cift tiklamayi engelle (OFF->ON yarisi token birakir)
  const [notifBusy, setNotifBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getNotificationsEnabled().then((v) => {
      if (!cancelled) setNotifEnabled(v);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const displayName =
    user?.fullName ||
    user?.firstName ||
    user?.primaryEmailAddress?.emailAddress ||
    "Kullanıcı";
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleNotifToggle(value: boolean) {
    if (notifBusy || notifEnabled === null) return;
    setNotifBusy(true);
    setNotifEnabled(value);
    await setNotificationsEnabled(value);
    if (!userId) {
      setNotifBusy(false);
      return;
    }

    try {
      if (value) {
        // Izin / Expo Go / token alimi ayristirilir; sebep kullaniciya net soylenir
        const res = await registerForPushNotifications();
        if (!res.ok) {
          setNotifEnabled(false);
          await setNotificationsEnabled(false);
          Alert.alert(
            "Bildirimler",
            res.reason === "denied"
              ? "Bildirim izni verilmedi. Telefonun ayarlarından uygulamaya bildirim izni verin."
              : res.reason === "expo-go"
                ? "Expo Go uzak bildirimleri desteklemiyor. Test için APK kurun."
                : res.message
          );
          return;
        }
        await saveDeviceToken(userId, res.token);
      } else {
        // Token'lar silinir; Edge Function bu kullaniciya artik push gonderemez
        await deleteDeviceTokens(userId);
      }
    } catch {
      setNotifEnabled(!value);
      await setNotificationsEnabled(!value);
      Alert.alert(
        "Bildirimler",
        value
          ? "Cihaz kaydedilemedi, tekrar deneyin."
          : "Bildirimler kapatılamadı, tekrar deneyin."
      );
    } finally {
      setNotifBusy(false);
    }
  }

  async function handleSignOut() {
    Alert.alert("Çıkış Yap", "Hesabınızdan çıkış yapmak istediğinize emin misiniz?", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Çıkış Yap",
        style: "destructive",
        onPress: () => {
          // Cikmadan once bu cihazin token'ini sil; aksi halde eski hesap
          // bildirim almaya devam eder ve ayni cihaz cift bildirim alir
          if (userId) deleteDeviceTokens(userId).catch(() => {});
          signOut();
        },
      },
    ]);
  }

  function handleBack() {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top", "bottom"]}>
      <View className="flex-row items-center px-5 pt-3 pb-2">
        <Pressable
          onPress={handleBack}
          className="w-10 h-10 rounded-full bg-white border border-gray-100 shadow-sm items-center justify-center"
        >
          <ChevronLeft size={22} color="#374151" />
        </Pressable>
        <Text className="text-xl font-bold text-gray-900 ml-3">Ayarlar</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Profil bilgileri */}
        <View className="mx-4 mt-3 bg-white border border-gray-100 rounded-2xl p-4 flex-row items-center">
          <View className="w-14 h-14 rounded-full bg-primary items-center justify-center">
            <Text className="text-white text-xl font-bold">{initials}</Text>
          </View>
          <View className="flex-1 ml-4">
            <Text className="text-lg font-bold text-gray-900" numberOfLines={1}>
              {displayName}
            </Text>
            {!!email && (
              <Text className="text-sm text-gray-500 mt-0.5" numberOfLines={1}>
                {email}
              </Text>
            )}
          </View>
        </View>

        {/* Bildirimler */}
        <Text className="text-gray-700 font-semibold mx-4 mt-6 mb-2">Bildirimler</Text>
        <View className="mx-4 bg-white border border-gray-100 rounded-2xl px-4 py-4 flex-row items-center">
          <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
            <BellRing size={20} color="#2D26F0" />
          </View>
          <View className="flex-1 ml-3 mr-2">
            <Text className="text-base font-semibold text-gray-900">Push Bildirimleri</Text>
            <Text className="text-xs text-gray-500 mt-0.5">
              Etkinlik hatırlatmaları cihazına gönderilir
            </Text>
          </View>
          <Switch
            value={notifEnabled ?? false}
            onValueChange={handleNotifToggle}
            disabled={notifEnabled === null || notifBusy}
            trackColor={{ true: "#2D26F0", false: "#D1D5DB" }}
            thumbColor="#ffffff"
          />
        </View>

        {/* Hesap */}
        <Text className="text-gray-700 font-semibold mx-4 mt-6 mb-2">Hesap</Text>
        <Pressable
          onPress={handleSignOut}
          className="mx-4 bg-white border border-red-100 rounded-2xl px-4 py-4 flex-row items-center active:bg-red-50"
        >
          <View className="w-10 h-10 rounded-full bg-red-50 items-center justify-center">
            <LogOut size={20} color="#DC2626" />
          </View>
          <Text className="text-base font-semibold text-danger ml-3">Çıkış Yap</Text>
        </Pressable>

        <View className="pb-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
