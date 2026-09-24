import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import type { ForwardedRef } from "react";
import { Platform, View } from "react-native";
import PagerView from "react-native-pager-view";
import { Text } from "../AppText";
import { WEEKDAYS_TR, addMonths, getMonthMatrix } from "../../lib/date";
import { CELL_H } from "./constants";
import { MonthGrid } from "./MonthGrid";
import type { DayDots, DayEvents } from "./types";

export type { DayDots, DayEvents } from "./types";

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

/** Ok tuşlarindan (veya baska bir dis tetikleyiciden) ay degistirmek icin disariya acilan imperatif handle */
export interface CalendarGridHandle {
    /** Onceki aya kayarak (native slide animasyonuyla) gecer */
    goToPrevMonth: () => void;
    /** Sonraki aya kayarak (native slide animasyonuyla) gecer */
    goToNextMonth: () => void;
}

function CalendarGridInner(
    {
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
    }: CalendarGridProps,
    ref: ForwardedRef<CalendarGridHandle>,
) {
    const pagerRef = useRef<any>(null);

    const pages = useMemo(
        () => [addMonths(monthDate, -1), monthDate, addMonths(monthDate, 1)],
        [monthDate],
    );

    const handlePageSelect = useCallback(
        (e: { nativeEvent: { position: number } }) => {
            const pos = e.nativeEvent.position;
            if (pos === 1) return;
            onMonthChange?.(pages[pos]);
        },
        [pages, onMonthChange],
    );

    useEffect(() => {
        pagerRef.current?.setPageWithoutAnimation(1);
    }, [monthDate]);

    // Ok tuşlari (uygulama ust barindaki ‹ ›) bu handle uzerinden PagerView'i
    // 0. veya 2. sayfaya kaydirir; PagerView bunu native olarak animasyonlu
    // yapar, sayfa yerlesince handlePageSelect zaten monthDate'i gunceller ve
    // yukaridaki efekt gorunmez sekilde 1. sayfaya sifirlar (swipe'la ayni akis).
    // Web'de PagerView olmadigi icin dogrudan ay degistirilir (animasyonsuz).
    useImperativeHandle(
        ref,
        () => ({
            goToPrevMonth: () => {
                if (Platform.OS === "web") onMonthChange?.(addMonths(monthDate, -1));
                else pagerRef.current?.setPage(0);
            },
            goToNextMonth: () => {
                if (Platform.OS === "web") onMonthChange?.(addMonths(monthDate, 1));
                else pagerRef.current?.setPage(2);
            },
        }),
        [monthDate, onMonthChange],
    );

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
        [selectedDate, onSelectDay, onLongPressDay, dots, dayEvents, rangeStart, rangeEnd, onPressMore],
    );

    const weekCount = useMemo(() => getMonthMatrix(monthDate).length, [monthDate]);

    // Hucreler artik bosluksuz bitisik: toplam yukseklik = satir sayisi * hucre + dis cerceve (2px)
    const gridHeight = weekCount * CELL_H + 2;

    return (
        <View>
            <View className="flex-row mb-0.5">
                {WEEKDAYS_TR.map(wd => (
                    <View key={wd} className="flex-1 items-center py-1.5">
                        <Text className="text-gray-400 text-[11px] font-extrabold">{wd}</Text>
                    </View>
                ))}
            </View>

            {Platform.OS === "web" ? (
                <MonthGrid month={monthDate} {...gridProps} />
            ) : (
                <PagerView ref={pagerRef} style={{ height: gridHeight }} initialPage={1} onPageSelected={handlePageSelect}>
                    {pages.map(month => (
                        <View key={`${month.getFullYear()}-${month.getMonth()}`}>
                            <MonthGrid month={month} {...gridProps} />
                        </View>
                    ))}
                </PagerView>
            )}
        </View>
    );
}

const CalendarGrid = forwardRef(CalendarGridInner);

export default CalendarGrid;
