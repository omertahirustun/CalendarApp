import { useMemo } from "react";
import { View, Text, FlatList, ScrollView } from "react-native";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { LinearGradient } from "expo-linear-gradient";
import { cssInterop } from "nativewind";
import { CalendarClock, ListTodo, CalendarX2 } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Header from "../../components/Header";
import EmptyState from "../../components/EmptyState";
import EventCard from "../../components/EventCard";
import { useEventsRealtime } from "../../hooks/useEventsRealtime";
import { useTasksRealtime } from "../../hooks/useTasksRealtime";
import {
  AGENDA_GROUP_LABELS,
  MONTHS_TR,
  agendaGroupOf,
  isSameMonth,
  type AgendaGroup,
} from "../../lib/date";
import type { EventRow } from "../../lib/types";

// NativeWind className destegi icin ucuncu parti bileşeni kaydet
cssInterop(LinearGradient, { className: "style" });

const GROUP_ORDER: AgendaGroup[] = ["today", "tomorrow", "week", "later"];

export default function AgendaScreen() {
  const { userId } = useAuth();
  const { user } = useUser();
  const { items: events, loading, error } = useEventsRealtime(userId);
  const { items: tasks } = useTasksRealtime(userId);

  const now = new Date();

  // Bu ay ozeti
  const monthSummary = useMemo(() => {
    const monthEvents = events.filter((e) => isSameMonth(new Date(e.start_time), now));
    return { events: monthEvents.length, tasks: tasks.length };
  }, [events, tasks]);

  // Gecmis eventleri at, gruplara ayir
  const grouped = useMemo(() => {
    const groups = new Map<AgendaGroup, EventRow[]>();
    for (const ev of events) {
      if (new Date(ev.end_time) < now) continue;
      const g = agendaGroupOf(ev.start_time);
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(ev);
    }
    return groups;
  }, [events]);

  const hasAnyUpcoming = grouped.size > 0;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <Header name={user?.firstName} />

      {/* Koyu ay ozeti karti */}
      <View className="mx-4">
        <LinearGradient
          colors={["#4C1D95", "#7C3AED"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="rounded-3xl px-5 py-5"
        >
          <Text className="text-white/70 text-sm font-semibold">
            {MONTHS_TR[now.getMonth()]} {now.getFullYear()}
          </Text>
          <Text className="text-white text-2xl font-bold mt-0.5">Bu Ay</Text>
          <View className="flex-row mt-4">
            <View className="flex-row items-center bg-white/15 rounded-2xl px-4 py-3 mr-3">
              <CalendarClock size={18} color="#fff" />
              <Text className="text-white font-bold ml-2">{monthSummary.events} etkinlik</Text>
            </View>
            <View className="flex-row items-center bg-white/15 rounded-2xl px-4 py-3">
              <ListTodo size={18} color="#fff" />
              <Text className="text-white font-bold ml-2">{monthSummary.tasks} görev</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      <FlatList
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
        data={GROUP_ORDER}
        keyExtractor={(g) => g}
        renderItem={({ item: group }) => {
          const list = grouped.get(group) ?? [];
          if (list.length === 0) return null;
          return (
            <View className="mt-5">
              <Text className="text-lg font-bold text-gray-900 mb-2">
                {AGENDA_GROUP_LABELS[group]}
              </Text>
              {list.map((ev) => (
                <EventCard key={ev.id} event={ev} />
              ))}
            </View>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <Text className="text-gray-400 text-center py-10">Yükleniyor...</Text>
          ) : error ? (
            <Text className="text-danger text-center py-10">{error}</Text>
          ) : !hasAnyUpcoming ? (
            <ScrollView>
              <EmptyState
                icon={CalendarX2}
                title="Yaklaşan etkinlik yok"
                subtitle="Takvim sekmesinden yeni etkinlik ekleyebilirsin"
              />
            </ScrollView>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
