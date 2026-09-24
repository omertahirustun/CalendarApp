import { memo } from "react";
import { Pressable, View } from "react-native";
import { contrastTextColor, withAlpha } from "../lib/color";
import { getEventBaseColor, isPersonalEvent, PERSONAL_EVENT_BORDER, PERSONAL_EVENT_FILL } from "../lib/eventColor";
import type { EventRow } from "../lib/types";
import { Text } from "./AppText";

interface EventChipProps {
    event: EventRow;
    /** Onceki/sonraki ay gunlerinde soluk gosterim */
    dimmed?: boolean;
    onPress?: () => void;
    onLongPress?: () => void;
}

function EventChipInner({ event, onPress, onLongPress, dimmed }: EventChipProps) {
    const personal = isPersonalEvent(event);
    const bgColor = getEventBaseColor(event);
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
                className="rounded-[5px] px-1.5 py-[2px] mb-[3px]"
                style={{
                    backgroundColor: personal ? PERSONAL_EVENT_FILL : withAlpha(bgColor, dimmed ? 0.35 : 0.85),
                    borderWidth: 1,
                    borderColor: personal ? PERSONAL_EVENT_BORDER : withAlpha(bgColor, dimmed ? 0.45 : 0.95),
                }}
            >
                <Text
                    className="text-[10px] font-semibold text-center"
                    numberOfLines={1}
                    style={{ color: fg, lineHeight: 11, width: "100%" }}
                >
                    {event.title}
                </Text>
            </View>
        </Pressable>
    );
}

const EventChip = memo(EventChipInner);
export default EventChip;
