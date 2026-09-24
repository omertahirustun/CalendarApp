import { memo, useMemo } from "react";
import { View } from "react-native";
import {
    getMonthMatrix,
    getRangePosition,
    isMultiDay,
    isSameDay,
    isSameMonth,
    startOfDay,
    toISODateString,
} from "../../lib/date";
import { BORDER_COLOR, CELL_H, GRID_RADIUS, MAX_VISIBLE_BARS } from "./constants";
import { DayCell } from "./DayCell";
import { MultiDayEventBar } from "./MultiDayEventBar";
import type { DayDots, DayEvents, EventBarDescriptor } from "./types";

function computeWeekEventBars(week: Date[], dayEvents: DayEvents): EventBarDescriptor[] {
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

            // Bu araligi kapsayan en kucuk bos lane'i bul (klasik takvim satir paketleme):
            // onceki koddaki "bars.findIndex(...) + 1" mantigi lane yerine dizi indeksini
            // kullaniyordu ve cakisan iki cubugun ayni lane'e duşup ust uste binmesine yol aciyordu.
            let lane = 0;
            while (bars.some(b => b.lane === lane && colStart <= b.colEnd && colEnd >= b.colStart)) {
                lane++;
            }

            bars.push({ event: ev, colStart, colEnd, lane });
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

    const barsByWeek = useMemo(() => {
        const map = new Map<number, EventBarDescriptor[]>();
        for (let wi = 0; wi < weeks.length; wi++) {
            map.set(wi, computeWeekEventBars(weeks[wi], dayEvents));
        }
        return map;
    }, [weeks, dayEvents]);

    return (
        <View
            style={{
                borderWidth: 1,
                borderColor: BORDER_COLOR,
                borderRadius: GRID_RADIUS,
                overflow: "hidden",
            }}
        >
            {weeks.map((week, wi) => {
                const bars = barsByWeek.get(wi) ?? [];
                const renderedBars = [...bars].sort((a, b) => a.lane - b.lane).slice(0, MAX_VISIBLE_BARS);

                const barsOverflowPerDay = new Map<number, number>();
                const barRowsPerDay = new Map<number, number>();

                for (let c = 0; c < 7; c++) {
                    const allOnCol = bars.filter(b => c >= b.colStart && c <= b.colEnd).length;
                    const renderedOnCol = renderedBars.filter(b => c >= b.colStart && c <= b.colEnd);
                    const overflow = allOnCol - renderedOnCol.length;
                    if (overflow > 0) barsOverflowPerDay.set(c, overflow);

                    if (renderedOnCol.length > 0) {
                        // En yuksek lane indeksine gore yer ayir: bir gun sadece ust lane'e
                        // denk geliyorsa bile (alt lane bosken), altindaki chip'ler cubugun
                        // altinda kalsin diye yeterli bosluk birakilmali.
                        const maxLane = Math.max(...renderedOnCol.map(b => b.lane));
                        barRowsPerDay.set(c, maxLane + 1);
                    }
                }

                return (
                    <View key={wi} style={{ flexDirection: "row", position: "relative" }}>
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
                                    isLastRow={wi === weeks.length - 1}
                                />
                            );
                        })}

                        {renderedBars.length > 0 && (
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
                                {renderedBars.map(bar => (
                                    <MultiDayEventBar
                                        key={bar.event.id}
                                        bar={bar}
                                        week={week}
                                        dimmed={!isSameMonth(week[0], month)}
                                    />
                                ))}
                            </View>
                        )}
                    </View>
                );
            })}
        </View>
    );
}

// PagerView her zaman 3 sayfa (onceki/mevcut/sonraki ay) tutar; `month` prop'u
// her navigasyonda addMonths() ile YENI bir Date nesnesi olarak gelir. Varsayilan
// memo() referans karsilastirmasi yaptigi icin, aslinda ayni takvim ayini gosteren
// bir sayfa bile (orn. "sonraki ay" -> bir sonraki navigasyonda "mevcut ay" olur)
// sirf Date referansi degisti diye computeWeekEventBars'i bastan calistiriyordu —
// yani her ok tuşuna basildiginda 3 ayin TAMAMI gereksiz yere yeniden hesaplaniyordu.
// Deger bazli karsilastirma ile degismeyen sayfalar render'i tamamen atlar.
function monthGridPropsEqual(prev: Parameters<typeof MonthGridInner>[0], next: Parameters<typeof MonthGridInner>[0]) {
    return (
        prev.month.getFullYear() === next.month.getFullYear() &&
        prev.month.getMonth() === next.month.getMonth() &&
        prev.selectedDate.getTime() === next.selectedDate.getTime() &&
        prev.onSelectDay === next.onSelectDay &&
        prev.onLongPressDay === next.onLongPressDay &&
        prev.dots === next.dots &&
        prev.dayEvents === next.dayEvents &&
        (prev.rangeStart?.getTime() ?? null) === (next.rangeStart?.getTime() ?? null) &&
        (prev.rangeEnd?.getTime() ?? null) === (next.rangeEnd?.getTime() ?? null) &&
        prev.onPressMore === next.onPressMore
    );
}

export const MonthGrid = memo(MonthGridInner, monthGridPropsEqual);
