import { Modal, View, Pressable, FlatList } from "react-native";
import { Text } from "./AppText";
import { X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import EventCard from "./EventCard";
import { formatFullDate, isToday } from "../lib/date";
import type { EventRow } from "../lib/types";

interface DayEventsSheetProps {
  visible: boolean;
  date: Date;
  events: EventRow[];
  onClose: () => void;
  onEditEvent: (ev: EventRow) => void;
}

export default function DayEventsSheet({
  visible,
  date,
  events,
  onClose,
  onEditEvent,
}: DayEventsSheetProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = (insets.bottom > 0 ? insets.bottom : 32) + 16;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View className="flex-1 justify-end bg-black/40">
        <Pressable className="flex-1" onPress={onClose} />
        <View
          className="bg-white rounded-t-3xl"
          style={{ maxHeight: "80%", paddingBottom: bottomPad }}
        >
          <View className="flex-row items-center justify-between px-5 pt-5 pb-3">
            <View className="flex-1 mr-3">
              <Text className="text-lg font-bold text-gray-900">
                {isToday(date) ? "Bugün" : formatFullDate(date)}
              </Text>
              <Text className="text-sm text-gray-500">
                {events.length} etkinlik
              </Text>
            </View>
            <Pressable onPress={onClose} className="p-1.5 rounded-full bg-gray-100">
              <X size={20} color="#6B7280" />
            </Pressable>
          </View>

          <FlatList
            data={events}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View className="px-5 mb-2">
                <EventCard event={item} onPress={() => onEditEvent(item)} />
              </View>
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 8 }}
          />
        </View>
      </View>
    </Modal>
  );
}
