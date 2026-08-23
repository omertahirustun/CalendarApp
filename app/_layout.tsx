import "./global.css";
import React, { useEffect } from "react";
import { Platform, View, ActivityIndicator } from "react-native";
import * as SecureStore from "expo-secure-store";
import { StatusBar } from "expo-status-bar";
import { Slot, Redirect, useSegments, useRouter } from "expo-router";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { setClerkTokenGetter } from "../lib/supabase";
import { usePushNotifications } from "../hooks/usePushNotifications";

const CLERK_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

const tokenCache =
  Platform.OS === "web"
    ? undefined
    : {
        async getToken(key: string) {
          try {
            return await SecureStore.getItemAsync(key);
          } catch {
            return null;
          }
        },
        async saveToken(key: string, value: string) {
          try {
            await SecureStore.setItemAsync(key, value);
          } catch {
            // yoksay
          }
        },
      };

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Supabase istekleri icin guncel Clerk JWT saglayicisini bagla
  useEffect(() => {
    setClerkTokenGetter(() => getToken({ template: "supabase" }));
  }, [getToken]);

  // Push bildirim kaydi (giris yapan kullanici)
  usePushNotifications(isSignedIn ? true : false);

  const inAuth = segments[0] === "(auth)";

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn && !inAuth) {
      router.replace("/(auth)/sign-in");
    } else if (isSignedIn && inAuth) {
      router.replace("/(tabs)");
    }
  }, [isLoaded, isSignedIn, inAuth, router]);

  if (!isLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  if (!isSignedIn && !inAuth) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return <>{children}</>;
}

function RootNavigator() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AuthGate>
        <Slot />
      </AuthGate>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  if (!CLERK_KEY) {
    console.warn(
      "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY tanimli degil. .env dosyasini .env.example'a gore doldurun."
    );
  }

  return (
    <ClerkProvider publishableKey={CLERK_KEY ?? ""} tokenCache={tokenCache}>
      <RootNavigator />
    </ClerkProvider>
  );
}
