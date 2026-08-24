import { useCallback, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, Alert } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { Plus, CalendarX2 } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Header from "../../components/Header";
import CalendarGrid, { type DayDots } from "../../components/CalendarGrid";
import EventCard from "../../components/EventCard";
import EventFormModal from "../../components/EventFormModal";
import EmptyState from "../../components/EmptyState";
import { useEventsRealtime } from "../../hooks/useEventsRealtime";
import { createEvent, deleteEvent, updateEvent, type EventInput } from "../../lib/api";
import type { EventRow } from "../../lib/types";
import {
  MONTHS_TR,
  addMonths,
  isSameDay,
  isToday,
  formatFullDate,
  toISODateString,
} from "../../lib/date";

export default function CalendarScreen() {
  const { userId } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const { items: events, loading, error, refetch } = useEventsRealtime(userId);

  // Sekmeye her donuste veriyi tazele; realtime gecikse/kesilse bile liste guncel kalir
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<EventRow | null>(null);

  // Takvim gunleri -> etkinlik renkleri (gun numarasi daire rengi icin)
  const dots: DayDots = useMemo(() => {
    const map: DayDots = {};
    for (const ev of events) {
      const d = new Date(ev.start_time);
      const key = toISODateString(d);
      if (!map[key]) map[key] = [];
      if (!map[key].includes(ev.color)) map[key].push(ev.color);
    }
    return map;
  }, [events]);

  const dayEvents = useMemo(
    () =>
      events.filter((ev) =>
        isSameDay(new Date(ev.start_time), selectedDate)
      ),
    [events, selectedDate]
  );

  const openCreate = useCallback(() => {
    setEditing(null);
    setFormVisible(true);
  }, []);

  const openEdit = useCallback((ev: EventRow) => {
    setEditing(ev);
    setFormVisible(true);
  }, []);

  // Silme onayi EventFormModal icinde sorulur; burada dogrudan silinir
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

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <Header
        name={user?.fullName || user?.firstName}
        onSettingsPress={() => router.push("/settings")}
      />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Ay navigasyonu + takvim karti */}
        <View className="mx-4 bg-white rounded-2xl shadow-sm border border-gray-100 px-2 pt-3 pb-4">
          <View className="flex-row items-center justify-between mb-1">
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

          <CalendarGrid
            monthDate={monthDate}
            selectedDate={selectedDate}
            onSelectDay={(d) => {
              setSelectedDate(d);
              if (d.getMonth() !== monthDate.getMonth()) setMonthDate(d);
            }}
            onMonthChange={setMonthDate}
            dots={dots}
          />
        </View>

        {/* Secili gun paneli */}
        <View className="px-4 mt-5 pb-28">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-xl font-bold text-gray-900">
              {isToday(selectedDate)
                ? "Bugün"
                : formatFullDate(selectedDate)}
            </Text>
            <Text className="text-gray-500 text-sm">{dayEvents.length} etkinlik</Text>
          </View>

          {loading ? (
            <Text className="text-gray-400 text-center py-8">Yükleniyor...</Text>
          ) : error ? (
            <Text className="text-danger text-center py-8">{error}</Text>
          ) : dayEvents.length === 0 ? (
            <EmptyState
              icon={CalendarX2}
              title="Bu günde etkinlik yok"
              subtitle="Eklemek için sağ alttaki + butonuna dokun"
            />
          ) : (
            dayEvents.map((ev) => (
              <EventCard
                key={ev.id}
                event={ev}
                onLongPress={() => openEdit(ev)}
              />
            ))
          )}
        </View>
      </ScrollView>

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
    </SafeAreaView>
  );
}
