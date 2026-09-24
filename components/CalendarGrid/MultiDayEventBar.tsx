import { View } from "react-native";
import { Text } from "../AppText";
import { addDays, daysBetween, isSameDay, startOfDay } from "../../lib/date";
import { contrastTextColor, withAlpha } from "../../lib/color";
import { getEventBaseColor, isPersonalEvent, PERSONAL_EVENT_BORDER, PERSONAL_EVENT_FILL } from "../../lib/eventColor";
import { BAR_SLOT_H, BAR_VISUAL_H, CHIP_RADIUS, DAY_NUM_H } from "./constants";
import type { EventBarDescriptor } from "./types";

export function MultiDayEventBar({
    bar,
    week,
    dimmed,
}: {
    bar: EventBarDescriptor;
    week: Date[];
    dimmed: boolean;
}) {
    const ev = bar.event;
    const personal = isPersonalEvent(ev);
    const baseColor = getEventBaseColor(ev);
    const evStart = startOfDay(new Date(ev.start_time));
    const evEnd = startOfDay(new Date(ev.end_time));
    const isRealStart = isSameDay(week[bar.colStart], evStart);
    const isRealEnd = isSameDay(week[bar.colEnd], evEnd);

    const leftPct = (bar.colStart / 7) * 100;
    const widthPct = ((bar.colEnd - bar.colStart + 1) / 7) * 100;

    const totalDays = daysBetween(evStart, evEnd);
    const middleDay = addDays(evStart, Math.floor((totalDays - 1) / 2));
    const showTitle =
        middleDay.getTime() >= week[bar.colStart].getTime() && middleDay.getTime() <= week[bar.colEnd].getTime();

    return (
        <View
            style={{
                position: "absolute",
                left: `${leftPct}%`,
                width: `${widthPct}%`,
                // DAY_NUM_H (32px) + 2px mt-0.5 boşluğu. Matematik artık şaşmaz.
                top: DAY_NUM_H + 2 + bar.lane * BAR_SLOT_H,
                height: BAR_VISUAL_H,
                // px-1 sınıfının karşılığı (hücre kenarlarından 4px içeride başlar/biter)
                paddingLeft: isRealStart ? 4 : 0,
                paddingRight: isRealEnd ? 4 : 0,
            }}
        >
            <View
                style={{
                    flex: 1,
                    backgroundColor: personal ? PERSONAL_EVENT_FILL : withAlpha(baseColor, dimmed ? 0.35 : 0.85),
                    borderWidth: 1, // EventChip ile aynı
                    borderColor: personal ? PERSONAL_EVENT_BORDER : withAlpha(baseColor, dimmed ? 0.45 : 0.95),
                    borderTopLeftRadius: isRealStart ? CHIP_RADIUS : 0,
                    borderBottomLeftRadius: isRealStart ? CHIP_RADIUS : 0,
                    borderTopRightRadius: isRealEnd ? CHIP_RADIUS : 0,
                    borderBottomRightRadius: isRealEnd ? CHIP_RADIUS : 0,
                    justifyContent: "center",
                    // Yazıyı EventChip'teki px-1.5 gibi hizalamak istersen 'flex-start' veya ortalı 'center' bırakabilirsin
                    alignItems: "center",
                    overflow: "hidden",
                }}
            >
                {showTitle && (
                    <Text
                        numberOfLines={1}
                        style={{
                            fontSize: 10, // EventChip ile tam aynı font
                            fontWeight: "600",
                            color: contrastTextColor(baseColor),
                            paddingHorizontal: 6, // EventChip px-1.5 karşılığı
                            lineHeight: 12, // EventChip ile tam aynı satır yüksekliği
                            textAlign: "center",
                        }}
                    >
                        {ev.title}
                    </Text>
                )}
            </View>
        </View>
    );
}
