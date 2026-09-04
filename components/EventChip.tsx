import { memo } from "react";
import { View, Pressable } from "react-native";
import { Text } from "./AppText";
import { formatTime } from "../lib/date";
import { EVENT_CATEGORY_META, type EventRow, type EventCategory } from "../lib/types";

interface EventChipProps {
  event: EventRow;
  onPress?: () => void;
  onLongPress?: () => void;
}

function EventChipInner({ event, onPress, onLongPress }: EventChipProps) {
  const meta = EVENT_CATEGORY_META[(event.category ?? "other") as EventCategory];

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      style={({ pressed }) => ({
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View
        className="flex-row items-center rounded-md px-1 py-0.5 mb-0.5"
        style={{ backgroundColor: `${event.color}18` }}
      >
        <View
          className="w-1 h-3.5 rounded-full mr-1"
          style={{ backgroundColor: event.color }}
        />
        <Text
          className="text-[9px] font-semibold flex-shrink"
          numberOfLines={1}
          style={{ color: event.color, lineHeight: 12 }}
        >
          {event.title}
        </Text>
        <Text
          className="text-[8px] text-gray-400 ml-auto flex-shrink-0"
          style={{ lineHeight: 12 }}
        >
          {formatTime(event.start_time)}
        </Text>
      </View>
    </Pressable>
  );
}

const EventChip = memo(EventChipInner);
export default EventChip;
