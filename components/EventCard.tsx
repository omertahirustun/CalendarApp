import { View, Text, Pressable } from "react-native";
import { User } from "lucide-react-native";
import { formatTime } from "../lib/date";
import {
  EVENT_CATEGORY_META,
  type EventRow,
  type EventCategory,
} from "../lib/types";

interface EventCardProps {
  event: EventRow;
  /** Dokununca duzenleme acilir (Takvim + Ajanda ortak davranis) */
  onPress?: () => void;
  /** Geriye uyumluluk icin uzun basma destegi */
  onLongPress?: () => void;
}

export default function EventCard({ event, onPress, onLongPress }: EventCardProps) {
  const meta = EVENT_CATEGORY_META[(event.category ?? "other") as EventCategory];

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 border-l-4 overflow-hidden mb-3"
      style={{ borderLeftColor: event.color }}
    >
      <View className="px-4 py-2.5">
        {/* Kategori rozeti + saat araligi */}
        <View className="flex-row items-center justify-between mb-1">
          <View
            className="flex-row items-center rounded-full px-2.5 py-1"
            style={{ backgroundColor: `${meta.color}1A` }}
          >
            <Text className="text-[11px]">{meta.emoji}</Text>
            <Text
              className="text-[11px] font-bold ml-1"
              style={{ color: meta.color }}
            >
              {meta.label}
            </Text>
          </View>
          <Text className="text-gray-500 text-xs font-semibold">
            {formatTime(event.start_time)} – {formatTime(event.end_time)}
          </Text>
        </View>

        {/* Baslik + ekleyen kisi ayni satirda */}
        <View className="flex-row items-center justify-between">
          <Text className="text-gray-900 font-bold text-base flex-1" numberOfLines={1}>
            {event.title}
          </Text>

          {event.created_by_name ? (
            <View className="flex-row items-center ml-2">
              <User size={11} color="#9CA3AF" />
              <Text
                className="text-gray-400 text-xs ml-1 flex-shrink"
                numberOfLines={1}
              >
                {event.created_by_name}
              </Text>
            </View>
          ) : null}
        </View>

        {event.location ? (
          <Text className="text-gray-500 text-sm mt-0.5" numberOfLines={1}>
            📍 {event.location}
          </Text>
        ) : null}

        {event.description ? (
          <Text className="text-gray-500 text-xs mt-1" numberOfLines={2}>
            {event.description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
