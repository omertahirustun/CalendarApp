import { memo } from "react";
import { Pressable, View } from "react-native";
import { Text } from "../AppText";
import EventChip from "../EventChip";
import {
    getRangePosition,
    isMultiDay,
    isSameMonth,
    isToday,
    toISODateString,
} from "../../lib/date";
import { COLORS } from "../../lib/theme";
import {
    BAR_SLOT_H,
    BORDER_COLOR,
    CELL_H,
    DAY_NUM_H,
    MAX_VISIBLE_CHIPS,
    PRIMARY_COLOR,
    WEEKEND_TEXT_COLOR,
} from "./constants";
import type { DayDots, DayEvents } from "./types";

function DayCellInner({
    day,
    month,
    selected,
    onSelect,
    onLongPress,
    dots,
    dayEvents,
    rangePos,
    onPressMore,
    barRows,
    barsOverflow,
    isLastRow,
}: {
    day: Date;
    month: Date;
    selected: boolean;
    onSelect: (d: Date) => void;
    onLongPress: (d: Date) => void;
    dots: DayDots;
    dayEvents: DayEvents;
    rangePos: ReturnType<typeof getRangePosition>;
    onPressMore?: (d: Date) => void;
    barRows?: number;
    barsOverflow?: number;
    isLastRow: boolean;
}) {
    const inMonth = isSameMonth(day, month);
    const today = isToday(day);
    const isoKey = toISODateString(day);
    const allEvents = dayEvents[isoKey] ?? [];
    const singleDayEvents = allEvents.filter(ev => !isMultiDay(ev));
    const visibleEvents = singleDayEvents.slice(0, MAX_VISIBLE_CHIPS);
    const singleOverflow = Math.max(singleDayEvents.length - MAX_VISIBLE_CHIPS, 0);
    const totalHidden = (barsOverflow ?? 0) + singleOverflow;
    const hasMore = totalHidden > 0;

    const isStart = rangePos === "start" || rangePos === "single";
    const isEnd = rangePos === "end" || rangePos === "single";
    const isMiddle = rangePos === "middle";
    const inRange = rangePos !== null;
    const isWeekend = day.getDay() === 0 || day.getDay() === 6;

    // Hucre arka plani artik hafta sonu/disi-ay icin degismiyor (Samsung Takvim
    // tarzi: haftaici beyazi sabit kalir, farklilik sadece gun numarasi renginde
    // gosterilir) — secili/araligin arka planlari oldugu gibi korunuyor
    let boxBg: string;
    if (inRange) {
        boxBg = isMiddle ? COLORS.rangeMiddleBg : COLORS.rangeEdgeBg;
    } else if (selected) {
        boxBg = COLORS.todayBg;
    } else {
        boxBg = "#FFFFFF";
    }

    const dayNumColor = selected
        ? PRIMARY_COLOR
        : today
        ? PRIMARY_COLOR
        : !inMonth
        ? "#D1D5DB"
        : isWeekend
        ? WEEKEND_TEXT_COLOR
        : "#1F2937";

    return (
        <Pressable
            onPress={() => onSelect(day)}
            onLongPress={() => onLongPress(day)}
            delayLongPress={400}
            className="flex-1"
            android_ripple={{
                color: "rgba(107,114,128,0.18)",
                borderless: false,
                foreground: true,
            }}
            style={{
                height: CELL_H,
                backgroundColor: boxBg,
                // Samsung Takvim'deki gibi sadece haftalar arasinda (yatay) ince
                // gri cizgi — gunler arasinda dikey cizgi yok
                borderBottomWidth: isLastRow ? 0 : 1,
                borderColor: BORDER_COLOR,
                overflow: "hidden",
            }}
        >
            {(isStart || isEnd) && (
                <View
                    className="absolute bg-primary/15"
                    style={{ top: 0, bottom: 0, left: 0, right: 0 }}
                    pointerEvents="none"
                />
            )}

            <View className="pt-1.5 items-center" style={{ height: DAY_NUM_H }}>
                <View
                    className="w-7 h-7 items-center justify-center"
                    style={{ borderRadius: 10, backgroundColor: "transparent" }}
                >
                    <Text
                        className="text-xs font-extrabold"
                        style={{
                            color: isMiddle && !selected ? PRIMARY_COLOR : dayNumColor,
                        }}
                    >
                        {day.getDate()}
                    </Text>
                </View>
            </View>

            {/* Cok gunluk etkinlik cubuklari icin ayrilan bos alan (cubuklar hafta satirinin ustune ayrica cizilir).
            Normal etkinlik chip'leriyle ayni hizadan baslasin diye DAY_NUM_H ile ayni referans kullanilir. */}
            {(barRows ?? 0) > 0 && <View style={{ height: (barRows ?? 0) * BAR_SLOT_H }} />}

            {(visibleEvents.length > 0 || hasMore) && (
                <View className="px-1 mt-0.5">
                    {visibleEvents.map(ev => (
                        <EventChip
                            key={ev.id}
                            event={ev}
                            dimmed={!inMonth}
                            onPress={() => onSelect(day)}
                            onLongPress={() => onLongPress(day)}
                        />
                    ))}

                    {hasMore && (
                        <Pressable onPress={() => onPressMore?.(day)} className="items-center">
                            <Text className="text-[9px] font-semibold text-primary">+{totalHidden} daha</Text>
                        </Pressable>
                    )}
                </View>
            )}
        </Pressable>
    );
}

export const DayCell = memo(DayCellInner);
