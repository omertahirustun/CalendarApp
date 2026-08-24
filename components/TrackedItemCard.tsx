import { memo } from "react";
import { View, Text, Pressable, Linking } from "react-native";
import { Trash2, Link2 } from "lucide-react-native";
import CheckboxCircle from "./CheckboxCircle";
import type { TrackedItemRow } from "../lib/types";

interface TrackedItemCardProps {
  item: TrackedItemRow;
  /** Stabil referans icin item'i parametre olarak alir */
  onToggle: (item: TrackedItemRow) => void;
  onDelete?: (item: TrackedItemRow) => void;
}

function TrackedItemCardBase({ item, onToggle, onDelete }: TrackedItemCardProps) {
  const completed = item.status === "completed";

  return (
    <View
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 border-l-4 mb-3 ${
        completed ? "opacity-60" : ""
      }`}
      style={{ borderLeftColor: item.color }}
    >
      <View className="flex-row items-center px-4 py-3.5">
        <CheckboxCircle
          checked={completed}
          onToggle={() => onToggle(item)}
        />

        <View className="flex-1 ml-3">
          <Text
            className={`text-base font-semibold ${completed ? "line-through text-gray-400" : "text-gray-900"}`}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          {item.note ? (
            <Text className={`text-xs mt-1 ${completed ? "text-gray-300" : "text-gray-500"}`} numberOfLines={2}>
              {item.note}
            </Text>
          ) : null}
          {item.link ? (
            <Pressable
              onPress={() => Linking.openURL(item.link!)}
              className="flex-row items-center gap-1 mt-1"
            >
              <Link2 size={12} color="#2D26F0" />
              <Text className="text-primary text-xs" numberOfLines={1}>
                {item.link.replace(/^https?:\/\//, "")}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {onDelete && (
          <Pressable onPress={() => onDelete(item)} hitSlop={8} className="p-2">
            <Trash2 size={18} color="#EF4444" />
          </Pressable>
        )}
      </View>
    </View>
  );
}

/** Surukleme sirasinda diger kartlarin gereksiz re-render'ini onler */
const TrackedItemCard = memo(TrackedItemCardBase);

export default TrackedItemCard;
