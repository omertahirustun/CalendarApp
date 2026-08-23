import { useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import { WEEKDAYS_TR, getMonthMatrix, isSameDay, isToday, isSameMonth } from "../lib/date";

export interface DayDots {
  /** ISO tarih (YYYY-MM-DD) -> o gundeki renkler */
  [isoDate: string]: string[];
}

interface CalendarGridProps {
  monthDate: Date;
  selectedDate: Date;
  onSelectDay: (d: Date) => void;
  dots: DayDots;
}

const CELL = 42;

export default function CalendarGrid({ monthDate, selectedDate, onSelectDay, dots }: CalendarGridProps) {
  const weeks = useMemo(() => getMonthMatrix(monthDate), [monthDate]);

  return (
    <View>
      <View className="flex-row mb-1">
        {WEEKDAYS_TR.map((wd) => (
          <View key={wd} className="flex-1 items-center py-2">
            <Text className="text-gray-400 text-xs font-semibold">{wd}</Text>
          </View>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} className="flex-row">
          {week.map((day) => {
            const inMonth = isSameMonth(day, monthDate);
            const selected = isSameDay(day, selectedDate);
            const today = isToday(day);
            const isoKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
            const dayDots = (dots[isoKey] ?? []).slice(0, 3);

            return (
              <Pressable
                key={isoKey}
                onPress={() => onSelectDay(day)}
                className="flex-1 items-center"
                style={{ height: CELL }}
              >
                <View
                  className={`w-9 h-9 rounded-full items-center justify-center mt-0.5 ${
                    selected ? "bg-primary" : ""
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      selected ? "text-white" : today ? "text-primary" : inMonth ? "text-gray-800" : "text-gray-300"
                    }`}
                  >
                    {day.getDate()}
                  </Text>
                </View>

                <View className="flex-row gap-1 mt-1 h-1.5">
                  {dayDots.map((c, i) => (
                    <View key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c }} />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
