import { View, Text, Pressable } from "react-native";
import { Pencil, Trash2 } from "lucide-react-native";
import { formatTime } from "../lib/date";
import type { EventRow } from "../lib/types";

interface EventCardProps {
  event: EventRow;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function EventCard({ event, onEdit, onDelete }: EventCardProps) {
  return (
    <View className="bg-white rounded-2xl shadow-sm border border-gray-100 border-l-4 mb-3 overflow-hidden" style={{ borderLeftColor: event.color }}>
      <View className="flex-row items-center px-4 py-3.5">
        <View className="flex-1">
          <Text className="text-gray-900 font-bold text-base" numberOfLines={1}>
            {event.title}
          </Text>
          <Text className="text-gray-500 text-sm mt-0.5">
            {formatTime(event.start_time)} – {formatTime(event.end_time)}
            {event.location ? ` · ${event.location}` : ""}
          </Text>
        </View>

        {onEdit && (
          <Pressable onPress={onEdit} hitSlop={8} className="p-2">
            <Pencil size={18} color="#9CA3AF" />
          </Pressable>
        )}
        {onDelete && (
          <Pressable onPress={onDelete} hitSlop={8} className="p-2 ml-1">
            <Trash2 size={18} color="#EF4444" />
          </Pressable>
        )}
      </View>
      {event.description ? (
        <Text className="text-gray-500 text-xs px-4 pb-3 -mt-1" numberOfLines={2}>
          {event.description}
        </Text>
      ) : null}
    </View>
  );
}
