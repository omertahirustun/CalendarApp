import { memo } from "react";
import { View, Pressable } from "react-native";
import { Text } from "./AppText";
import type { EventRow } from "../lib/types";

/** Hex rengin parlakligina gore beyaz veya koyu metin rengi dondurur */
function contrastTextColor(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  // YIQ parlamaformulu: 299*R + 587*G + 114*B / 1000
  const luminance = (r * 299 + g * 587 + b * 114) / 1000;
  return luminance > 210 ? "#1F2937" : "#FFFFFF";
}

interface EventChipProps {
  event: EventRow;
  /** Onceki/sonraki ay gunlerinde soluk gosterim */
  dimmed?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}

function EventChipInner({ event, onPress, onLongPress, dimmed }: EventChipProps) {
  const bgColor = event.color;
  const fg = contrastTextColor(bgColor);

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
        className="rounded-md px-1.5 py-[3px] mb-[3px]"
        style={{
          backgroundColor: bgColor,
          opacity: dimmed ? 0.4 : 1,
        }}
      >
        <Text
          className="text-[8px] font-semibold"
          numberOfLines={1}
          style={{ color: fg, lineHeight: 11 }}
        >
          {event.title}
        </Text>
      </View>
    </Pressable>
  );
}

const EventChip = memo(EventChipInner);
export default EventChip;
