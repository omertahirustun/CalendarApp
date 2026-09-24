import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Text } from "./AppText";
import { Pencil, Trash2, MapPin, User, Users } from "lucide-react-native";
import { formatDayMonth, formatTime, isMultiDay } from "../lib/date";
import { confirmDeleteEvent } from "../lib/confirmDeleteEvent";
import { PERSONAL_EVENT_COLOR } from "../lib/eventColor";
import { withAlpha } from "../lib/color";
import { EVENT_CATEGORY_META, EVENT_VISIBILITY_META, type EventCategory, type EventRow } from "../lib/types";

interface EventDetailModalProps {
  visible: boolean;
  event: EventRow | null;
  onClose: () => void;
  onEdit: (event: EventRow) => void;
  onDelete: (event: EventRow) => void;
}

export default function EventDetailModal({ visible, event, onClose, onEdit, onDelete }: EventDetailModalProps) {
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
    } else if (mounted) {
      progress.value = withTiming(0, { duration: 160, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.92 + progress.value * 0.08 }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value * 0.4 }));

  if (!mounted || !event) return null;

  const meta =
    EVENT_CATEGORY_META[(event.category ?? "other") as EventCategory] ?? EVENT_CATEGORY_META.other;
  const personal = event.visibility === "personal";
  const multiDay = isMultiDay(event);

  function handleDelete() {
    if (!event) return;
    confirmDeleteEvent(event.title, () => onDelete(event));
  }

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View className="flex-1 items-center justify-center px-8">
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[backdropStyle, StyleSheet.absoluteFill, { backgroundColor: "#000" }]}
          pointerEvents="none"
        />
        <Animated.View style={[cardStyle, { width: "100%", maxWidth: 360 }]} pointerEvents="box-none">
          <View className="bg-white rounded-3xl p-5">
            <View className="flex-row items-center flex-wrap gap-2 mb-3">
              <View
                className="flex-row items-center rounded-full px-2.5 py-1"
                style={{ backgroundColor: `${meta.color}1A` }}
              >
                <Text className="text-[11px]">{meta.emoji}</Text>
                <Text className="text-[11px] font-bold ml-1" style={{ color: meta.color }}>
                  {meta.label}
                </Text>
              </View>
              {personal && (
                <View
                  className="rounded-full px-2.5 py-1"
                  style={{ backgroundColor: withAlpha(PERSONAL_EVENT_COLOR, 0.15) }}
                >
                  <Text className="text-[11px] font-bold" style={{ color: PERSONAL_EVENT_COLOR }}>
                    {EVENT_VISIBILITY_META.personal.label}
                  </Text>
                </View>
              )}
            </View>

            <Text className="text-gray-900 font-bold text-xl mb-1">{event.title}</Text>

            <Text className="text-gray-500 text-sm font-semibold">
              {formatTime(event.start_time)} – {formatTime(event.end_time)}
            </Text>
            {multiDay && (
              <Text className="text-gray-400 text-xs font-semibold mt-0.5">
                {formatDayMonth(event.start_time)} – {formatDayMonth(event.end_time)}
              </Text>
            )}

            {event.location ? (
              <View className="flex-row items-center mt-3">
                <MapPin size={14} color="#6B7280" />
                <Text className="text-gray-600 text-sm ml-1.5 flex-shrink">
                  {/* Sondaki bosluk: Android'de flex satirlarda son harfin kirpilmesini onler */}
                  {event.location + " "}
                </Text>
              </View>
            ) : null}

            {event.created_by_name ? (
              <View className="flex-row items-center mt-2">
                <User size={14} color="#6B7280" />
                <Text className="text-gray-600 text-sm ml-1.5 flex-shrink">
                  {event.created_by_name + " "}
                </Text>
              </View>
            ) : null}

            {event.attendees && event.attendees.length > 0 ? (
              <View className="flex-row items-start mt-2">
                <Users size={14} color="#6B7280" style={{ marginTop: 2 }} />
                <Text className="text-gray-600 text-sm ml-1.5 flex-shrink">
                  {event.attendees.map((a) => a.display_name).join(", ") + " "}
                </Text>
              </View>
            ) : null}

            {event.description ? (
              <View className="mt-3 bg-gray-50 rounded-2xl px-3.5 py-3">
                <Text className="text-gray-500 text-[11px] font-bold mb-1">NOTLAR</Text>
                <Text className="text-gray-700 text-sm">{event.description}</Text>
              </View>
            ) : null}

            <View className="flex-row gap-2 mt-5">
              <Pressable
                onPress={() => onEdit(event)}
                className="flex-1 flex-row items-center justify-center rounded-2xl bg-primary py-3"
              >
                <Pencil size={16} color="#fff" />
                <Text className="text-white font-semibold ml-2">Düzenle</Text>
              </Pressable>
              <Pressable
                onPress={handleDelete}
                className="flex-1 flex-row items-center justify-center rounded-2xl border border-red-200 bg-red-50 py-3"
              >
                <Trash2 size={16} color="#EF4444" />
                <Text className="text-danger font-semibold ml-2">Sil</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
