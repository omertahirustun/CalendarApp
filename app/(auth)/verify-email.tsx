import { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useSignUp, useClerk } from "@clerk/clerk-expo";
import { MailCheck } from "lucide-react-native";
import { friendlyClerkError } from "../../lib/clerk";

export default function VerifyEmailScreen() {
  const { signUp, isLoaded } = useSignUp();
  const { setActive } = useClerk();
  const router = useRouter();
  const codeRef = useRef<TextInput>(null);

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleVerify(codeOverride?: string) {
    if (!isLoaded) return;
    const value = (codeOverride ?? code).trim();
    if (value.length < 6) {
      Alert.alert("Hata", "6 haneli doğrulama kodunu girin.");
      return;
    }
    setLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code: value });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(tabs)");
      } else {
        // complete disindaki durumlar sessiz kalmasin
        Alert.alert("Doğrulama hatası", "Doğrulama tamamlanamadı. Kodu kontrol edip tekrar deneyin.");
        setCode("");
      }
    } catch (err: any) {
      Alert.alert("Doğrulama hatası", friendlyClerkError(err));
      // Hatali/suresi gecmis kodu temizle; kullanici yeniden yazabilsin
      setCode("");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!isLoaded || resending) return;
    setResending(true);
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      Alert.alert("Kod gönderildi", "Yeni doğrulama kodu e-postana gönderildi.");
    } catch (err: any) {
      Alert.alert("Hata", friendlyClerkError(err));
    } finally {
      setResending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View className="flex-1 justify-center px-6">
        <View className="items-center mb-8">
          <View className="w-20 h-20 rounded-3xl bg-primary-softer items-center justify-center mb-4">
            <MailCheck size={40} color="#2D26F0" />
          </View>
          <Text className="text-3xl font-bold text-gray-900 text-center">E-postanı doğrula</Text>
          <Text className="text-gray-500 mt-2 text-center px-4">
            E-posta adresine gönderdiğimiz 6 haneli kodu gir
          </Text>
        </View>

        <TextInput
          ref={codeRef}
          className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-4 text-center text-2xl tracking-[12px] font-bold text-gray-900 mb-6"
          placeholder="000000"
          keyboardType="number-pad"
          maxLength={6}
          value={code}
          onChangeText={(t) => {
            const cleaned = t.replace(/[^0-9]/g, "");
            setCode(cleaned);
            if (cleaned.length === 6 && !loading) handleVerify(cleaned);
          }}
          placeholderTextColor="#9CA3AF"
        />

        <Pressable
          onPress={() => handleVerify()}
          disabled={loading}
          className={`rounded-2xl py-4 items-center ${loading ? "bg-primary/60" : "bg-primary"}`}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-base">Doğrula</Text>
          )}
        </Pressable>

        <Pressable
          onPress={handleResend}
          disabled={resending}
          className="mt-5 items-center"
        >
          <Text className="text-primary font-semibold text-sm">
            {resending ? "Gönderiliyor..." : "Kod gelmedi mi? Tekrar gönder"}
          </Text>
        </Pressable>

        <Pressable onPress={() => router.replace("/(auth)/sign-up")} className="mt-3 items-center">
          <Text className="text-gray-400 text-sm">Kayıt ekranına dön</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
