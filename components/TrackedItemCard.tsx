import { memo } from "react";
import {
  View,
  Pressable,
  Linking
} from "react-native";
import { Text } from "./AppText";
import { Trash2, Link2 } from "lucide-react-native";
import CheckboxCircle from "./CheckboxCircle";
import { CARD_RIPPLE, delayedPress } from "../lib/pressDelay";
import type { TrackedItemRow } from "../lib/types";

interface TrackedItemCardProps {
  item: TrackedItemRow;
  /** Stabil referans icin item'i parametre olarak alir */
  onToggle: (item: TrackedItemRow) => void;
  onDelete?: (item: TrackedItemRow) => void;
  /** Karta dokununca duzenleme acar (verilmezse dokunma etkisiz) */
  onEdit?: (item: TrackedItemRow) => void;
}

function TrackedItemCardBase({
  item,
  onToggle,
  onDelete,
  onEdit,
}: TrackedItemCardProps) {
  const completed = item.status === "completed";

  return (
    // Renk seridi: absolute sol bar (border-l-4 gorunumu, cakismasiz)
    <View className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-3 overflow-hidden">
      <View
        pointerEvents="none"
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: item.color }}
      />
      <Pressable
        onPress={delayedPress(onEdit ? () => onEdit(item) : undefined)}
        android_ripple={CARD_RIPPLE}
        disabled={!onEdit}
        style={({ pressed }) => ({ opacity: pressed && onEdit ? 0.85 : 1 })}
      >
        <View className="pl-5 pr-4 py-3.5 flex-row items-center">
          <CheckboxCircle
            checked={completed}
            onToggle={() => onToggle(item)}
          />

          {/* Baslik/not; link varsa icteki Pressable oncelikli, linke dokunma
              duzenleme acmaz. Duzenleme dalga efektinden sonra acilir. */}
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
      </Pressable>
    </View>
  );
}

/** Liste kaydirirken diger kartlarin gereksiz re-render'ini onler */
const TrackedItemCard = memo(TrackedItemCardBase);

export default TrackedItemCard;
