import { View, Text } from "react-native";
import type { LucideIcon } from "lucide-react-native";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
}

export default function EmptyState({ icon: Icon, title, subtitle }: EmptyStateProps) {
  return (
    <View className="items-center justify-center py-16 px-6">
      <View className="w-20 h-20 rounded-3xl bg-primary-softer items-center justify-center mb-4">
        <Icon size={36} color="#7C3AED" />
      </View>
      <Text className="text-gray-900 font-bold text-base text-center">{title}</Text>
      {subtitle && (
        <Text className="text-gray-500 text-sm text-center mt-1">{subtitle}</Text>
      )}
    </View>
  );
}
