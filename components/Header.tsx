import {
  View,
  Pressable
} from "react-native";
import { Text } from "./AppText";
import { Settings } from "lucide-react-native";
import { MONTHS_TR } from "../lib/date";

interface HeaderProps {
  name?: string | null;
  onSettingsPress?: () => void;
  title?: string;
}

export default function Header({ name, onSettingsPress, title }: HeaderProps) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : "İyi akşamlar";
  const todayLabel = `${new Date().getDate()} ${MONTHS_TR[new Date().getMonth()]} ${new Date().getFullYear()}`;

  return (
    <View className="flex-row items-center justify-between px-5 pt-3 pb-2">
      <View className="flex-1">
        <Text className="text-gray-500 text-sm">{todayLabel}</Text>
        <Text className="text-2xl font-bold text-gray-900 mt-0.5">
          {title ?? `${greeting}, ${name ?? "Misafir"}`}
        </Text>
      </View>
      {onSettingsPress && (
        <Pressable
          onPress={onSettingsPress}
          className="w-11 h-11 rounded-full bg-white shadow-sm items-center justify-center border border-gray-100"
        >
          <Settings size={22} color="#6B7280" />
        </Pressable>
      )}
    </View>
  );
}
