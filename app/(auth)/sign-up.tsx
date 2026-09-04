import { useState } from "react";
import {
  View,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import { Text, TextInput } from "../../components/AppText";
import { Link, useRouter } from "expo-router";
import { useSignUp } from "@clerk/clerk-expo";
import { CalendarDays } from "lucide-react-native";
import { friendlyClerkError } from "../../lib/clerk";

const SCREEN_HEIGHT = Dimensions.get("window").height;

export default function SignUpScreen() {
  const { signUp, isLoaded } = useSignUp();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignUp() {
    if (!isLoaded) return;
    if (!fullName.trim() || !email.trim() || !password) {
      setError("Ad soyad, e-posta ve şifre gerekli.");
      return;
    }
    if (password.length < 8) {
      setError("Şifre en az 8 karakter olmalı.");
      return;
    }
    const trimmed = fullName.trim();
    const spaceIndex = trimmed.indexOf(" ");
    const firstName = spaceIndex === -1 ? trimmed : trimmed.slice(0, spaceIndex);
    const lastName =
      spaceIndex === -1 ? undefined : trimmed.slice(spaceIndex + 1).trim();
    setLoading(true);
    setError(null);
    try {
      await signUp.create({
        firstName,
        lastName,
        emailAddress: email.trim(),
        password,
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      router.push("/(auth)/verify-email");
    } catch (err: any) {
      Alert.alert("Kayıt hatası", friendlyClerkError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ minHeight: SCREEN_HEIGHT * 0.85, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: "center", marginBottom: 16 }}>
          <View className="w-20 h-20 rounded-3xl bg-primary items-center justify-center mb-4">
            <CalendarDays size={40} color="#fff" />
          </View>
          <Text className="text-3xl font-bold text-gray-900">Hesap oluştur</Text>
          <Text className="text-gray-500 mt-1 text-center" style={{ alignSelf: "stretch" }}>E-posta ile ücretsiz kaydolun</Text>
        </View>

        {error && (
          <View className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-4">
            <Text className="text-danger text-sm">{error}</Text>
          </View>
        )}

        <Text className="text-gray-700 font-semibold mb-2">Ad Soyad</Text>
        <TextInput
          className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-base mb-4 text-gray-900"
          placeholder="Adın Soyadın"
          autoCapitalize="words"
          value={fullName}
          onChangeText={setFullName}
          placeholderTextColor="#9CA3AF"
        />

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

        <Text className="text-gray-700 font-semibold mb-2">Şifre</Text>
        <TextInput
          className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-base mb-2 text-gray-900"
          placeholder="En az 8 karakter"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          value={password}
          onChangeText={setPassword}
          placeholderTextColor="#9CA3AF"
        />

        <Pressable
          onPress={handleSignUp}
          disabled={loading}
          className={`rounded-2xl py-4 mt-6 items-center ${loading ? "bg-primary/60" : "bg-primary"}`}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-base">Doğrulama Kodu Gönder</Text>
          )}
        </Pressable>

        <View className="flex-row justify-center mt-6">
          <Text className="text-gray-500">Zaten hesabınız var mı? </Text>
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
