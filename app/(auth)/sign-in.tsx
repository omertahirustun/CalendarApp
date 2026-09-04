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
import { useSignIn } from "@clerk/clerk-expo";
import { CalendarDays } from "lucide-react-native";
import { friendlyClerkError } from "../../lib/clerk";

const SCREEN_HEIGHT = Dimensions.get("window").height;

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    if (!isLoaded) return;
    if (!email.trim() || !password) {
      setError("E-posta ve şifre gerekli.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await signIn.create({
        identifier: email.trim(),
        password,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(tabs)");
      } else {
        setError("Giriş tamamlanamadı. Lütfen tekrar deneyin.");
      }
    } catch (err: any) {
      Alert.alert("Giriş hatası", friendlyClerkError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          minHeight: SCREEN_HEIGHT * 0.85,
          paddingHorizontal: 24,
          paddingTop: 60,
          paddingBottom: 40,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: "center", marginBottom: 16 }}>
          <View className="w-20 h-20 rounded-3xl bg-primary items-center justify-center mb-4">
            <CalendarDays size={40} color="#fff" />
          </View>
          <Text className="text-3xl font-bold text-gray-900 text-center">Hoş geldiniz</Text>
          <Text className="text-gray-500 mt-1 text-center" style={{ alignSelf: "stretch" }}>Hesabınıza giriş yapın</Text>
        </View>

        {error && (
          <View className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-4">
            <Text className="text-danger text-sm">{error}</Text>
          </View>
        )}

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
          placeholder="••••••••"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          value={password}
          onChangeText={setPassword}
          placeholderTextColor="#9CA3AF"
        />

        <Pressable
          onPress={() => router.push("/(auth)/reset-password")}
          className="self-end py-2"
        >
          <Text className="text-primary font-semibold text-sm">
            Şifremi unuttum
          </Text>
        </Pressable>

        <Pressable
          onPress={handleSignIn}
          disabled={loading}
          className={`rounded-2xl py-4 mt-6 items-center ${loading ? "bg-primary/60" : "bg-primary"}`}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-base">Giriş Yap</Text>
          )}
        </Pressable>

        <View className="flex-row justify-center mt-6">
          <Text className="text-gray-500">Hesabınız yok mu? </Text>
          <Link href="/(auth)/sign-up" asChild>
            <Pressable>
              <Text className="text-primary font-bold">Kayıt ol</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
