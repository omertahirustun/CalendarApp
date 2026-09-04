import { useCallback, useMemo, useState } from "react";
import {
  View,
  Pressable,
  Alert,
} from "react-native";
import { Text } from "../../components/AppText";
import { useRouter, useFocusEffect } from "expo-router";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { Plus } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Header from "../../components/Header";
import CalendarGrid, { type DayDots, type DayEvents } from "../../components/CalendarGrid";
import EventFormModal from "../../components/EventFormModal";
import DayEventsSheet from "../../components/DayEventsSheet";
import { useEventsRealtime } from "../../hooks/useEventsRealtime";
import { createEvent, deleteEvent, updateEvent, type EventInput } from "../../lib/api";
import type { EventRow } from "../../lib/types";
import {
  MONTHS_TR,
  addMonths,
  isSameDay,
  toISODateString,
  isSameMonth,
  sortRange,
  daysBetween,
  formatRangeLabel,
  formatFullDate,
  isToday,
} from "../../lib/date";

export default function CalendarScreen() {
  const { userId } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const { items: events, loading, error, refetch } = useEventsRealtime(userId);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<EventRow | null>(null);

  // Range selection state
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);

  // Day events sheet
  const [sheetDate, setSheetDate] = useState<Date | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  // Takvim gunleri -> etkinlik renkleri
  const dots: DayDots = useMemo(() => {
    const map: DayDots = {};
    for (const ev of events) {
      const key = toISODateString(new Date(ev.start_time));
      if (!map[key]) map[key] = [];
      if (!map[key].includes(ev.color)) map[key].push(ev.color);
    }
    return map;
  }, [events]);

  // Takvim gunleri -> etkinlik listesi (hucre icinde gosterim icin)
  const dayEvents: DayEvents = useMemo(() => {
    const map: DayEvents = {};
    for (const ev of events) {
      const key = toISODateString(new Date(ev.start_time));
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    }
    return map;
  }, [events]);

  // Secili aralik/tarih icin etkinlikler
  const filteredEvents = useMemo(() => {
    if (rangeStart && rangeEnd) {
      const [lo, hi] = sortRange(rangeStart, rangeEnd);
      return events.filter((ev) => {
        const d = new Date(ev.start_time);
        return d >= lo && d <= hi;
      });
    }
    return events.filter((ev) => isSameDay(new Date(ev.start_time), selectedDate));
  }, [events, rangeStart, rangeEnd, selectedDate]);

  // Range label
  const rangeLabel = useMemo(() => {
    if (rangeStart && rangeEnd) {
      const count = daysBetween(rangeStart, rangeEnd);
      return `${formatRangeLabel(rangeStart, rangeEnd)}  ·  ${count} gün`;
    }
    return null;
  }, [rangeStart, rangeEnd]);

  const openCreate = useCallback(() => {
    setEditing(null);
    setFormVisible(true);
  }, []);

  const openEdit = useCallback((ev: EventRow) => {
    setEditing(ev);
    setFormVisible(true);
  }, []);

  const handleDelete = useCallback(() => {
    if (!editing) return;
    deleteEvent(editing.id)
      .catch((e) =>
        Alert.alert("Hata", e instanceof Error ? e.message : "Silinemedi.")
      )
      .finally(() => refetch());
  }, [editing, refetch]);

  const handleSubmit = useCallback(
    async (input: EventInput) => {
      if (!userId) return;
      if (editing) {
        await updateEvent(editing.id, input);
      } else {
        const creatorName = user?.fullName || user?.firstName || "Kullanıcı";
        await createEvent(userId, { ...input, created_by_name: creatorName });
      }
      refetch();
    },
    [userId, editing, user, refetch]
  );

  // Single day selection
  const handleSelectDay = useCallback(
    (d: Date) => {
      // If in range mode and range is already set, complete the range
      if (rangeStart && !rangeEnd) {
        const [lo, hi] = sortRange(rangeStart, d);
        setRangeEnd(hi);
        if (!isSameMonth(lo, monthDate)) setMonthDate(lo);
        if (!isSameMonth(hi, monthDate)) setMonthDate(hi);
        return;
      }

      // Otherwise: single day selection
      setRangeStart(null);
      setRangeEnd(null);
      setSelectedDate(d);
      if (!isSameMonth(d, monthDate)) setMonthDate(d);
    },
    [rangeStart, rangeEnd, monthDate]
  );

  // Long press: start range selection
  const handleLongPressDay = useCallback(
    (d: Date) => {
      // Reset existing range and start new one
      setRangeStart(d);
      setRangeEnd(null);
      setSelectedDate(d);
      if (!isSameMonth(d, monthDate)) setMonthDate(d);
    },
    [monthDate]
  );

  // "+N more" pressed: show day events sheet
  const handlePressMore = useCallback(
    (d: Date) => {
      setSheetDate(d);
      setSheetVisible(true);
    },
    []
  );

  // Clear range selection
  const clearRange = useCallback(() => {
    setRangeStart(null);
    setRangeEnd(null);
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <Header
        name={user?.fullName || user?.firstName}
        onSettingsPress={() => router.push("/settings")}
      />

      {/* Month navigation */}
      <View className="flex-row items-center justify-between px-4 py-1">
        <Pressable
          onPress={() => setMonthDate(addMonths(monthDate, -1))}
          className="w-9 h-9 rounded-full items-center justify-center"
        >
          <Text className="text-primary text-2xl font-bold">‹</Text>
        </Pressable>
        <Text className="text-lg font-bold text-gray-900">
          {MONTHS_TR[monthDate.getMonth()]} {monthDate.getFullYear()}
        </Text>
        <Pressable
          onPress={() => setMonthDate(addMonths(monthDate, 1))}
          className="w-9 h-9 rounded-full items-center justify-center"
        >
          <Text className="text-primary text-2xl font-bold">›</Text>
        </Pressable>
      </View>

      {/* Range label or selected day info */}
      {rangeLabel ? (
        <View className="flex-row items-center justify-between px-4 py-1.5">
          <Text className="text-sm font-semibold text-primary flex-1">
            {rangeLabel}
          </Text>
          <Pressable onPress={clearRange} className="px-3 py-1 rounded-full bg-primary/10">
            <Text className="text-xs font-semibold text-primary">Temizle</Text>
          </Pressable>
        </View>
      ) : (
        <View className="px-4 py-1.5">
          <Text className="text-sm text-gray-500">
            {isToday(selectedDate)
              ? "Bugün"
              : formatFullDate(selectedDate)}
            {filteredEvents.length > 0
              ? `  ·  ${filteredEvents.length} etkinlik`
              : ""}
          </Text>
        </View>
      )}

      {/* Full-screen calendar grid */}
      <View className="flex-1 px-2">
        <CalendarGrid
          monthDate={monthDate}
          selectedDate={selectedDate}
          onSelectDay={handleSelectDay}
          onLongPressDay={handleLongPressDay}
          onMonthChange={setMonthDate}
          dots={dots}
          dayEvents={dayEvents}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          onPressMore={handlePressMore}
        />
      </View>

      {/* FAB */}
      <Pressable
        onPress={openCreate}
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-primary shadow-lg items-center justify-center"
        style={{
          shadowColor: "#2D26F0",
          shadowOpacity: 0.4,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        <Plus size={28} color="#fff" strokeWidth={2.5} />
      </Pressable>

      <EventFormModal
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
        editing={editing}
        baseDate={selectedDate}
      />

      {/* Day events overflow sheet */}
      <DayEventsSheet
        visible={sheetVisible}
        date={sheetDate ?? new Date()}
        events={sheetDate ? (dayEvents[toISODateString(sheetDate)] ?? []) : []}
        onClose={() => setSheetVisible(false)}
        onEditEvent={(ev) => {
          setSheetVisible(false);
          openEdit(ev);
        }}
      />
    </SafeAreaView>
  );
}
