import { useCallback, useEffect, useMemo, useRef } from "react";
import { View, Text, Pressable } from "react-native";
import PagerView from "react-native-pager-view";
import type { NativeSyntheticEvent } from "react-native";
import { WEEKDAYS_TR, addMonths, getMonthMatrix, isSameDay, isToday, isSameMonth } from "../lib/date";

export interface DayDots {
  /** ISO tarih (YYYY-MM-DD) -> o gundeki renkler */
  [isoDate: string]: string[];
}

interface CalendarGridProps {
  monthDate: Date;
  selectedDate: Date;
  onSelectDay: (d: Date) => void;
  onMonthChange?: (d: Date) => void;
  dots: DayDots;
}

const CELL = 42;
const PAGE_HEIGHT = CELL * 6;
const PRIMARY_COLOR = "#2D26F0";

function MonthGrid({
  month,
  selectedDate,
  onSelectDay,
  dots,
}: {
  month: Date;
  selectedDate: Date;
  onSelectDay: (d: Date) => void;
  dots: DayDots;
}) {
  const weeks = useMemo(() => getMonthMatrix(month), [month]);

  return (
    <View style={{ height: PAGE_HEIGHT }}>
      {weeks.map((week, wi) => (
        <View key={wi} className="flex-row">
          {week.map((day) => {
            const inMonth = isSameMonth(day, month);
            const selected = isSameDay(day, selectedDate);
            const today = isToday(day);
            const isoKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
            // o gunde etkinlik varsa ilk etkinligin rengi baskindir
            const ringColor = dots[isoKey]?.[0];

            return (
              <Pressable
                key={isoKey}
                onPress={() => onSelectDay(day)}
                className="flex-1 items-center"
                style={{ height: CELL }}
              >
                <View
                  className="w-9 h-9 rounded-full items-center justify-center mt-0.5"
                  style={{
                    // yuvarlak cerceve garantisi
                    borderRadius: CELL,
                    borderWidth: !selected && ringColor !== undefined ? 1.5 : 0,
                    borderColor: ringColor,
                    backgroundColor:
                      selected
                        ? ringColor !== undefined
                          ? ringColor
                          : PRIMARY_COLOR
                        : "transparent",
                  }}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      selected ? "text-white" : today ? "text-primary" : inMonth ? "text-gray-800" : "text-gray-300"
                    }`}
                  >
                    {day.getDate()}
                  </Text>
                </View>
              </Pressable>
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
  onMonthChange,
  dots,
}: CalendarGridProps) {
  const pagerRef = useRef<PagerView>(null);

  // [onceki ay, mevcut ay, sonraki ay]
  const pages = useMemo(
    () => [addMonths(monthDate, -1), monthDate, addMonths(monthDate, 1)],
    [monthDate]
  );

  const handlePageSelect = useCallback(
    (e: NativeSyntheticEvent<{ position: number }>) => {
      const pos = e.nativeEvent.position;
      if (pos === 1) return;
      onMonthChange?.(pages[pos]);
    },
    [pages, onMonthChange]
  );

  // monthDate her degistiginde (ok butonu veya swipe) tekrar ortadaki sayfaya don
  useEffect(() => {
    pagerRef.current?.setPageWithoutAnimation(1);
  }, [monthDate]);

  return (
    <View>
      <View className="flex-row mb-1">
        {WEEKDAYS_TR.map((wd) => (
          <View key={wd} className="flex-1 items-center py-2">
            <Text className="text-gray-400 text-xs font-semibold">{wd}</Text>
          </View>
        ))}
      </View>

      <PagerView
        ref={pagerRef}
        style={{ height: PAGE_HEIGHT }}
        initialPage={1}
        onPageSelected={handlePageSelect}
      >
        {pages.map((month) => (
          <View key={`${month.getFullYear()}-${month.getMonth()}`}>
            <MonthGrid
              month={month}
              selectedDate={selectedDate}
              onSelectDay={onSelectDay}
              dots={dots}
            />
          </View>
        ))}
      </PagerView>
    </View>
  );
}
