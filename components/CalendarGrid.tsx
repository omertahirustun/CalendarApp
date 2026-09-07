import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Pressable,
  Platform,
  type LayoutChangeEvent,
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
  isMultiDay,
  startOfDay,
} from "../lib/date";
import type { EventRow } from "../lib/types";

interface EventBarDescriptor {
  event: EventRow;
  colStart: number;
  colEnd: number;
  lane: number;
}

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

const CELL_H = 92;
const MAX_VISIBLE_CHIPS = 2;
const MAX_VISIBLE_BARS = 2;
const PRIMARY_COLOR = "#2D26F0";
const BORDER_COLOR = "#ECEEF2";
const BORDER_RADIUS = 10;

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
}) {
  const inMonth = isSameMonth(day, month);
  const today = isToday(day);
  const isoKey = toISODateString(day);
  const allEvents = dayEvents[isoKey] ?? [];
  const singleDayEvents = allEvents.filter((ev) => !isMultiDay(ev));
  const visibleEvents = singleDayEvents.slice(0, MAX_VISIBLE_CHIPS);
  const singleOverflow = Math.max(singleDayEvents.length - MAX_VISIBLE_CHIPS, 0);
  const totalHidden = (barsOverflow ?? 0) + singleOverflow;
  const hasMore = totalHidden > 0;

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

      {/* Cok gunluk etkinlik barlari icin ayrilan alan (cabipler bunun altinda akar) */}
      {(barRows ?? 0) > 0 && (
        <View
          style={{
            height: (barRows ?? 0) * (BAR_H + BAR_GAP) + BAR_GAP,
          }}
        />
      )}

      {/* Event chips */}
      {(visibleEvents.length > 0 || hasMore) && (
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
                +{totalHidden} daha
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </Pressable>
  );
}

const DayCell = memo(DayCellInner);

const BAR_ZONE_TOP = 36;
const BAR_H = 20;
const BAR_GAP = 2;
const WEEK_GAP = 3;

function contrastTextColor(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const luminance = (r * 299 + g * 587 + b * 114) / 1000;
  return luminance > 210 ? "#1F2937" : "#FFFFFF";
}

function MultiDayEventBar({
  bar,
  dimmed,
  containerWidth,
}: {
  bar: EventBarDescriptor;
  dimmed: boolean;
  containerWidth: number;
}) {
  const ev = bar.event;
  const cellW = (containerWidth - 6 * WEEK_GAP) / 7;
  const cellStep = cellW + WEEK_GAP;
  const left = bar.colStart * cellStep;
  const width = (bar.colEnd - bar.colStart + 1) * cellStep - WEEK_GAP;
  const top = BAR_ZONE_TOP + bar.lane * (BAR_H + BAR_GAP);
  // Hafif seffaf zemin (sadece arka plan): metin opak kalir
  const bgColor = ev.color.startsWith("#") ? `${ev.color}8C` : ev.color;

  return (
    <View
      style={{
        position: "absolute",
        left,
        width,
        top,
        height: BAR_H,
        backgroundColor: bgColor,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: `${ev.color.startsWith("#") ? ev.color : "#cccccc"}55`,
        paddingHorizontal: 6,
        justifyContent: "center",
        alignItems: "center",
        opacity: dimmed ? 0.5 : 1,
        zIndex: 10 + bar.lane,
      }}
      pointerEvents="none"
    >
      <Text
        numberOfLines={1}
        style={{
          fontSize: 9,
          fontWeight: "600",
          color: contrastTextColor(ev.color),
          textAlign: "center",
        }}
      >
        {ev.title}
      </Text>
    </View>
  );
}

function computeWeekEventBars(
  week: Date[],
  dayEvents: DayEvents
): EventBarDescriptor[] {
  const bars: EventBarDescriptor[] = [];
  const weekStart = week[0].getTime();
  const weekEnd = week[6].getTime();
  const allEvIds = new Set<string>();

  for (let col = 0; col < 7; col++) {
    const isoKey = toISODateString(week[col]);
    const events = dayEvents[isoKey] ?? [];
    for (const ev of events) {
      if (!isMultiDay(ev) || allEvIds.has(ev.id)) continue;
      allEvIds.add(ev.id);

      const evStart = startOfDay(new Date(ev.start_time)).getTime();
      const evEnd = startOfDay(new Date(ev.end_time)).getTime();
      if (evEnd < weekStart || evStart > weekEnd) continue;

      const colStart = evStart <= weekStart ? 0 : col;
      let colEnd = col;
      for (let c = col + 1; c < 7; c++) {
        const cTime = week[c].getTime();
        if (cTime >= evStart && cTime <= evEnd) colEnd = c;
        else break;
      }

      const lane = bars.findIndex(
        (b) => colStart <= b.colEnd && colEnd >= b.colStart
      );
      bars.push({
        event: ev,
        colStart,
        colEnd,
        lane: lane === -1 ? 0 : lane + 1,
      });
    }
  }
  return bars;
}

function MonthGridInner({
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
  const [containerWidth, setContainerWidth] = useState(0);

  const handleContainerLayout = useCallback((e: LayoutChangeEvent) => {
    if (e.nativeEvent.layout.width > 0) {
      setContainerWidth(e.nativeEvent.layout.width);
    }
  }, []);

  const barsByWeek = useMemo(() => {
    const map = new Map<number, EventBarDescriptor[]>();
    for (let wi = 0; wi < weeks.length; wi++) {
      map.set(wi, computeWeekEventBars(weeks[wi], dayEvents));
    }
    return map;
  }, [weeks, dayEvents]);

  return (
    <View>
      {weeks.map((week, wi) => {
        const bars = barsByWeek.get(wi) ?? [];
        const renderedBars = [...bars]
          .sort((a, b) => a.lane - b.lane)
          .slice(0, MAX_VISIBLE_BARS);

        const barsOverflowPerDay = new Map<number, number>();
        const barRowsPerDay = new Map<number, number>();
        for (let c = 0; c < 7; c++) {
          const allOnCol = bars.filter(
            (b) => c >= b.colStart && c <= b.colEnd
          ).length;
          const renderedOnCol = renderedBars.filter(
            (b) => c >= b.colStart && c <= b.colEnd
          ).length;
          const overflow = allOnCol - renderedOnCol;
          if (overflow > 0) barsOverflowPerDay.set(c, overflow);
          if (renderedOnCol > 0) barRowsPerDay.set(c, renderedOnCol);
        }

        return (
          <View key={wi} style={{ marginBottom: 3 }}>
            <View
              className="flex-row"
              style={{ gap: WEEK_GAP, position: "relative" }}
              onLayout={handleContainerLayout}
            >
              {week.map((day, di) => {
                const rangePos = getRangePosition(day, rangeStart, rangeEnd);
                return (
                  <DayCell
                    key={toISODateString(day)}
                    day={day}
                    month={month}
                    selected={isSameDay(day, selectedDate)}
                    onSelect={onSelectDay}
                    onLongPress={onLongPressDay}
                    dots={dots}
                    dayEvents={dayEvents}
                    rangePos={rangePos}
                    onPressMore={onPressMore}
                    barRows={barRowsPerDay.get(di) ?? 0}
                    barsOverflow={barsOverflowPerDay.get(di) ?? 0}
                  />
                );
              })}

              {/* Cok gunluk etkinlik barlari: hucrelerin icinde, ayirma alani uzrinde */}
              {renderedBars.length > 0 &&
                containerWidth > 0 && (
                  <View
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: CELL_H,
                      pointerEvents: "none",
                    }}
                  >
                    {renderedBars.map((bar) => (
                      <MultiDayEventBar
                        key={bar.event.id}
                        bar={bar}
                        dimmed={!isSameMonth(week[0], month)}
                        containerWidth={containerWidth}
                      />
                    ))}
                  </View>
                )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const MonthGrid = memo(MonthGridInner);

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

  const gridProps = useMemo(
    () => ({
      selectedDate,
      onSelectDay,
      onLongPressDay: onLongPressDay ?? (() => {}),
      dots,
      dayEvents,
      rangeStart,
      rangeEnd,
      onPressMore,
    }),
    [
      selectedDate,
      onSelectDay,
      onLongPressDay,
      dots,
      dayEvents,
      rangeStart,
      rangeEnd,
      onPressMore,
    ]
  );

  // PagerView sabit yukseklik ister: merkez ayin gercek hafta sayisina gore
  // boyutlandir (kisa aylarda bos satir kalmasin).
  const weekCount = useMemo(() => getMonthMatrix(monthDate).length, [monthDate]);
  const gridHeight = weekCount * CELL_H + (weekCount - 1) * 3;

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
          style={{ height: gridHeight }}
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
