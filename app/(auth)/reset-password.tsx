import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { useSignIn, useClerk } from "@clerk/clerk-expo";
import { KeyRound } from "lucide-react-native";
import { friendlyClerkError } from "../../lib/clerk";

export default function ResetPasswordScreen() {
  const { signIn, isLoaded } = useSignIn();
  const { setActive } = useClerk();
  const router = useRouter();

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendResetCode() {
    if (!isLoaded || !email.trim()) {
      Alert.alert("Hata", "E-posta gerekli.");
      return;
    }
    setLoading(true);
    try {
      const created = await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email.trim(),
      });
      const factor = created.supportedFirstFactors?.find(
        (f) => f.strategy === "reset_password_email_code"
      ) as { emailAddressId?: string } | undefined;
      await signIn.prepareFirstFactor({
        strategy: "reset_password_email_code",
        ...(factor?.emailAddressId ? { emailAddressId: factor.emailAddressId } : {}),
      } as any);
      setStep("code");
    } catch (err: any) {
      Alert.alert("Hata", friendlyClerkError(err));
    } finally {
      setLoading(false);
    }
  }

  async function completeReset() {
    if (!isLoaded) return;
    if (code.trim().length < 6 || password.length < 8) {
      Alert.alert("Hata", "Kodu gir ve yeni şifre en az 8 karakter olmalı.");
      return;
    }
    setLoading(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: code.trim(),
        password,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(tabs)");
      }
    } catch (err: any) {
      Alert.alert("Hata", friendlyClerkError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow justify-center px-6 py-10"
        keyboardShouldPersistTaps="handled"
      >
        <View className="items-center mb-8">
          <View className="w-20 h-20 rounded-3xl bg-primary-softer items-center justify-center mb-4">
            <KeyRound size={40} color="#7C3AED" />
          </View>
          <Text className="text-3xl font-bold text-gray-900 text-center">Şifre sıfırla</Text>
          <Text className="text-gray-500 mt-2 text-center px-4">
            {step === "email"
              ? "E-posta adresine sıfırlama kodu gönderelim"
              : "Kodu ve yeni şifreni gir"}
          </Text>
        </View>

        {step === "email" ? (
          <>
            <Text className="text-gray-700 font-semibold mb-2">E-posta</Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-base mb-4 text-gray-900"
              placeholder="ornek@mail.com"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              placeholderTextColor="#9CA3AF"
            />
            <Pressable
              onPress={sendResetCode}
              disabled={loading}
              className={`rounded-2xl py-4 items-center ${loading ? "bg-primary/60" : "bg-primary"}`}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-bold text-base">Kod Gönder</Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <Text className="text-gray-700 font-semibold mb-2">Sıfırlama kodu</Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-base mb-4 text-gray-900"
              placeholder="6 haneli kod"
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={(t) => setCode(t.replace(/[^0-9]/g, ""))}
              placeholderTextColor="#9CA3AF"
            />
            <Text className="text-gray-700 font-semibold mb-2">Yeni şifre</Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-base mb-4 text-gray-900"
              placeholder="En az 8 karakter"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholderTextColor="#9CA3AF"
            />
            <Pressable
              onPress={completeReset}
              disabled={loading}
              className={`rounded-2xl py-4 items-center ${loading ? "bg-primary/60" : "bg-primary"}`}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-bold text-base">Şifreyi Güncelle</Text>
              )}
            </Pressable>
          </>
        )}

        <View className="flex-row justify-center mt-6">
          <Text className="text-gray-500">Hatırladın mı? </Text>
          <Link href="/(auth)/sign-in" asChild>
            <Pressable>
              <Text className="text-primary font-bold">Giriş yap</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
