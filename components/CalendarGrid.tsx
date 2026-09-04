import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  View,
  Pressable,
  Platform,
} from "react-native";
import { Text } from "./AppText";
import PagerView from "react-native-pager-view";
import EventChip from "./EventChip";
import {
  WEEKDAYS_TR,
  addMonths,
  getMonthMatrix,
  isSameDay,
  isToday,
  isSameMonth,
  toISODateString,
  getRangePosition,
  sortRange,
} from "../lib/date";
import type { EventRow } from "../lib/types";

export interface DayDots {
  [isoDate: string]: string[];
}

export interface DayEvents {
  [isoDate: string]: EventRow[];
}

interface CalendarGridProps {
  monthDate: Date;
  selectedDate: Date;
  onSelectDay: (d: Date) => void;
  onLongPressDay?: (d: Date) => void;
  onMonthChange?: (d: Date) => void;
  dots: DayDots;
  dayEvents?: DayEvents;
  rangeStart?: Date | null;
  rangeEnd?: Date | null;
  onPressMore?: (date: Date) => void;
}

const CELL_H = 96;
const MAX_VISIBLE_CHIPS = 2;
const PRIMARY_COLOR = "#2D26F0";
const BORDER_COLOR = "#ECEEF2";
const BORDER_RADIUS = 10;

function DayCell({
  day,
  month,
  selectedDate,
  onSelect,
  onLongPress,
  dots,
  dayEvents,
  rangePos,
  onPressMore,
}: {
  day: Date;
  month: Date;
  selectedDate: Date;
  onSelect: (d: Date) => void;
  onLongPress: (d: Date) => void;
  dots: DayDots;
  dayEvents: DayEvents;
  rangePos: ReturnType<typeof getRangePosition>;
  onPressMore?: (d: Date) => void;
}) {
  const inMonth = isSameMonth(day, month);
  const selected = isSameDay(day, selectedDate);
  const today = isToday(day);
  const isoKey = toISODateString(day);
  const events = dayEvents[isoKey] ?? [];
  const hasMore = events.length > MAX_VISIBLE_CHIPS;
  const visibleEvents = events.slice(0, MAX_VISIBLE_CHIPS);

  const isStart = rangePos === "start" || rangePos === "single";
  const isEnd = rangePos === "end" || rangePos === "single";
  const isMiddle = rangePos === "middle";
  const inRange = rangePos !== null;

  // Hafta sonu (Pzt=0 ... Paz=6 indexlemede) — JS getDay: 0=Pazar, 6=Cumartesi
  const isWeekend = day.getDay() === 0 || day.getDay() === 6;

  // Kutu arka plan rengi: hafta ici beyaz, hafta sonu daha koyu gri,
  // onceki/sonraki ay gunleri haftasonu grisi, secili ayri gri
  let boxBg: string;
  if (inRange) {
    boxBg = isMiddle ? "#EDEEFF" : "#E0E7FF";
  } else if (selected) {
    boxBg = "#E6E8EF";
  } else if (inMonth && isWeekend) {
    boxBg = "#E2E3E7";
  } else if (!inMonth) {
    boxBg = "#F2F2F4";
  } else {
    boxBg = "#FFFFFF";
  }

  const dayNumColor = selected
    ? PRIMARY_COLOR
    : today
      ? PRIMARY_COLOR
      : inMonth
        ? "#1F2937"
        : "#D1D5DB";

  return (
    <Pressable
      onPress={() => onSelect(day)}
      onLongPress={() => onLongPress(day)}
      delayLongPress={400}
      className="flex-1"
      android_ripple={{ color: "rgba(107,114,128,0.18)", borderless: false, foreground: true }}
      style={{
        height: CELL_H,
        backgroundColor: boxBg,
        borderWidth: 1,
        borderColor: BORDER_COLOR,
        borderRadius: BORDER_RADIUS,
        overflow: "hidden",
      }}
    >
      {/* Aralik baslangic/bitis vurgusu — sadece range seciliyken */}
      {(isStart || isEnd) && (
        <View
          className="absolute bg-primary/15"
          style={{ top: 0, bottom: 0, left: 0, right: 0 }}
          pointerEvents="none"
        />
      )}

      {/* Day number */}
      <View className="pl-1.5 pt-1.5 items-start">
        <View
          className="w-7 h-7 items-center justify-center"
          style={{
            borderRadius: 10,
            backgroundColor: "transparent",
          }}
        >
          <Text
            className="text-xs font-bold"
            style={{
              color: isMiddle && !selected
                ? PRIMARY_COLOR
                : dayNumColor,
            }}
          >
            {day.getDate()}
          </Text>
        </View>
      </View>

      {/* Event chips */}
      {visibleEvents.length > 0 && (
        <View className="px-1 mt-0.5">
          {visibleEvents.map((ev) => (
            <EventChip
              key={ev.id}
              event={ev}
              dimmed={!inMonth}
              onPress={() => onSelect(day)}
              onLongPress={() => onLongPress(day)}
            />
          ))}
          {hasMore && (
            <Pressable
              onPress={() => onPressMore?.(day)}
              className="items-center"
            >
              <Text className="text-[9px] font-semibold text-primary">
                +{events.length - MAX_VISIBLE_CHIPS} daha
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </Pressable>
  );
}

function MonthGrid({
  month,
  selectedDate,
  onSelectDay,
  onLongPressDay,
  dots,
  dayEvents,
  rangeStart,
  rangeEnd,
  onPressMore,
}: {
  month: Date;
  selectedDate: Date;
  onSelectDay: (d: Date) => void;
  onLongPressDay: (d: Date) => void;
  dots: DayDots;
  dayEvents: DayEvents;
  rangeStart: Date | null;
  rangeEnd: Date | null;
  onPressMore?: (d: Date) => void;
}) {
  const weeks = useMemo(() => getMonthMatrix(month), [month]);

  return (
    <View>
      {weeks.map((week, wi) => (
        <View key={wi} className="flex-row" style={{ gap: 3, marginBottom: 3 }}>
          {week.map((day) => {
            const rangePos = getRangePosition(day, rangeStart, rangeEnd);
            return (
              <DayCell
                key={toISODateString(day)}
                day={day}
                month={month}
                selectedDate={selectedDate}
                onSelect={onSelectDay}
                onLongPress={onLongPressDay}
                dots={dots}
                dayEvents={dayEvents}
                rangePos={rangePos}
                onPressMore={onPressMore}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

export default function CalendarGrid({
  monthDate,
  selectedDate,
  onSelectDay,
  onLongPressDay,
  onMonthChange,
  dots,
  dayEvents = {},
  rangeStart = null,
  rangeEnd = null,
  onPressMore,
}: CalendarGridProps) {
  const pagerRef = useRef<any>(null);

  const pages = useMemo(
    () => [addMonths(monthDate, -1), monthDate, addMonths(monthDate, 1)],
    [monthDate]
  );

  const handlePageSelect = useCallback(
    (e: { nativeEvent: { position: number } }) => {
      const pos = e.nativeEvent.position;
      if (pos === 1) return;
      onMonthChange?.(pages[pos]);
    },
    [pages, onMonthChange]
  );

  useEffect(() => {
    pagerRef.current?.setPageWithoutAnimation(1);
  }, [monthDate]);

  const gridProps = {
    selectedDate,
    onSelectDay,
    onLongPressDay: onLongPressDay ?? (() => {}),
    dots,
    dayEvents,
    rangeStart,
    rangeEnd,
    onPressMore,
  };

  return (
    <View>
      {/* Weekday headers */}
      <View className="flex-row mb-0.5">
        {WEEKDAYS_TR.map((wd) => (
          <View key={wd} className="flex-1 items-center py-1.5">
            <Text className="text-gray-400 text-[11px] font-semibold">{wd}</Text>
          </View>
        ))}
      </View>

      {Platform.OS === "web" ? (
        <MonthGrid month={monthDate} {...gridProps} />
      ) : (
        <PagerView
          ref={pagerRef}
          style={{ height: CELL_H * 6 + 3 * 5 }}
          initialPage={1}
          onPageSelected={handlePageSelect}
        >
          {pages.map((month) => (
            <View key={`${month.getFullYear()}-${month.getMonth()}`}>
              <MonthGrid month={month} {...gridProps} />
            </View>
          ))}
        </PagerView>
      )}
    </View>
  );
}
