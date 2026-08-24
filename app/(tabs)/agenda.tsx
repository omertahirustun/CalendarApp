import { useCallback, useMemo, useState } from "react";
import { View, Text, FlatList, ScrollView } from "react-native";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { LinearGradient } from "expo-linear-gradient";
import { cssInterop } from "nativewind";
import { CalendarX2 } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Header from "../../components/Header";
import EmptyState from "../../components/EmptyState";
import EventCard from "../../components/EventCard";
import EventFormModal from "../../components/EventFormModal";
import { useEventsRealtime } from "../../hooks/useEventsRealtime";
import { updateEvent, deleteEvent, type EventInput } from "../../lib/api";
import {
  MONTHS_TR,
  WEEKDAYS_TR,
  addDays,
  isToday,
  startOfDay,
  toISODateString,
} from "../../lib/date";
import type { EventRow } from "../../lib/types";

// NativeWind className destegi icin ucuncu parti bileşeni kaydet
cssInterop(LinearGradient, { className: "style" });

const AGENDA_WINDOW_DAYS = 30;

interface DayGroup {
  key: string;
  date: Date;
  events: EventRow[];
}

/** "Bugun" / "Yarin" / null */
function relativeLabel(d: Date): string | null {
  const diffDays = Math.round(
    (startOfDay(d).getTime() - startOfDay(new Date()).getTime()) / 86400000
  );
  if (diffDays === 0) return "Bugün";
  if (diffDays === 1) return "Yarın";
  return null;
}

export default function AgendaScreen() {
  const { userId } = useAuth();
  const { user } = useUser();
  const { items: events, loading, error } = useEventsRealtime(userId);

  const [editing, setEditing] = useState<EventRow | null>(null);
  const [formVisible, setFormVisible] = useState(false);

  const now = new Date();

  // Ay adi kartindaki ozet: yaklasan (30 gun) etkinlik sayisi
  const upcomingCount = useMemo(() => {
    const windowStart = startOfDay(new Date());
    const windowEnd = addDays(windowStart, AGENDA_WINDOW_DAYS);
    return events.filter((ev) => {
      const s = new Date(ev.start_time);
      return s >= windowStart && s <= windowEnd;
    }).length;
  }, [events]);

  // Bugunden itibaren 30 gun, baslangic zamanina gore kronolojik gruplar
  const dayGroups = useMemo<DayGroup[]>(() => {
    const windowStart = startOfDay(new Date());
    const windowEnd = addDays(windowStart, AGENDA_WINDOW_DAYS);

    const upcoming = events
      .filter((ev) => {
        const s = new Date(ev.start_time);
        return s >= windowStart && s <= windowEnd;
      })
      .sort(
        (a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );

    const groups: DayGroup[] = [];
    const index = new Map<string, DayGroup>();
    for (const ev of upcoming) {
      const d = new Date(ev.start_time);
      const key = toISODateString(d);
      let g = index.get(key);
      if (!g) {
        g = { key, date: startOfDay(d), events: [] };
        index.set(key, g);
        groups.push(g);
      }
      g.events.push(ev);
    }
    return groups;
  }, [events]);

  const openEdit = useCallback((ev: EventRow) => {
    setEditing(ev);
    setFormVisible(true);
  }, []);

  const closeForm = useCallback(() => setFormVisible(false), []);

  const handleSubmit = useCallback(
    async (input: EventInput) => {
      if (!editing) return;
      await updateEvent(editing.id, input);
    },
    [editing]
  );

  // Silme onayi EventFormModal icinde sorulur; burada dogrudan silinir
  const handleDelete = useCallback(() => {
    if (!editing) return;
    deleteEvent(editing.id).catch(() => {});
  }, [editing]);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <Header name={user?.firstName} />

      {/* Ay karti */}
      <View className="mx-4">
        <LinearGradient
          colors={["#261FD1", "#2D26F0"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="rounded-3xl px-5 py-6 overflow-hidden"
        >
          <Text className="absolute right-4 top-4 text-5xl opacity-25">
            🗓️
          </Text>
          <Text className="text-white text-3xl font-bold">
            {MONTHS_TR[now.getMonth()]} {now.getFullYear()}
          </Text>
          <Text className="text-white/70 text-sm mt-1.5">
            Toplam {upcomingCount} yaklaşan etkinlik
          </Text>
        </LinearGradient>
      </View>

      {/* Tarih rozetleri + etkinlik kartlari */}
      <FlatList
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
        data={dayGroups}
        keyExtractor={(g) => g.key}
        renderItem={({ item: group }) => {
          const today = isToday(group.date);
          const rel = relativeLabel(group.date);
          return (
            <View className="flex-row mt-5 gap-3">
              {/* Sol tarih rozeti */}
              <View className="w-14 items-center">
                <Text className="text-gray-400 text-xs font-bold tracking-wide">
                  {WEEKDAYS_TR[(group.date.getDay() + 6) % 7].toUpperCase()}
                </Text>
                <View
                  className={
                    today
                      ? "w-10 h-10 rounded-full items-center justify-center bg-primary mt-1"
                      : "w-10 h-10 rounded-full items-center justify-center bg-white border border-gray-200 mt-1"
                  }
                >
                  <Text
                    className={
                      today
                        ? "text-white text-base font-bold"
                        : "text-gray-900 text-base font-bold"
                    }
                  >
                    {group.date.getDate()}
                  </Text>
                </View>
                {rel ? (
                  <Text className="text-primary text-[10px] font-bold mt-1">
                    {rel}
                  </Text>
                ) : null}
              </View>

              {/* Sag etkinlik kartlari */}
              <View className="flex-1">
                {group.events.map((ev) => (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    onLongPress={() => openEdit(ev)}
                  />
                ))}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <Text className="text-gray-400 text-center py-10">Yükleniyor...</Text>
          ) : error ? (
            <Text className="text-danger text-center py-10">{error}</Text>
          ) : (
            <ScrollView>
              <EmptyState
                icon={CalendarX2}
                title="Yaklaşan etkinlik yok"
                subtitle="Takvim sekmesinden yeni etkinlik ekleyebilirsin"
              />
            </ScrollView>
          )
        }
      />

      {/* Long press ile acilan duzenleme modalı */}
      <EventFormModal
        visible={formVisible}
        onClose={closeForm}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
        editing={editing}
      />
    </SafeAreaView>
  );
}
