import { useCallback, useMemo, useState } from "react";
import { View, Text, FlatList, Alert } from "react-native";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useFocusEffect } from "expo-router";
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

const AGENDA_WINDOW_DAYS = 90;

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

/** Ayin mevsemine gore kart gradyan renkleri (kuzey yarimkure) */
function seasonColors(month: number): [string, string] {
  if (month === 11 || month <= 1) return ["#1D4ED8", "#38BDF8"]; // kis — buz mavisi
  if (month <= 4) return ["#047857", "#4ADE80"]; // ilkbahar — canli yesil
  if (month <= 7) return ["#EA580C", "#FBBF24"]; // yaz — gunes turuncusu
  return ["#78350F", "#E9A23B"]; // sonbahar — yaprak kahvesi
}

/** Mevsim gradyanli ay karti; liste icinde kayar, o ayin etkinlik sayisini gosterir */
function MonthCard({
  label,
  count,
  colors,
}: {
  label: string;
  count: number;
  colors: [string, string];
}) {
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="rounded-3xl px-5 py-6 overflow-hidden"
    >
      <Text className="absolute right-4 top-4 text-5xl opacity-25">🗓️</Text>
      <Text className="text-white text-3xl font-bold">{label}</Text>
      <Text className="text-white/70 text-sm mt-1.5">
        Bu ayda {count} etkinlik
      </Text>
    </LinearGradient>
  );
}

export default function AgendaScreen() {
  const { userId } = useAuth();
  const { user } = useUser();
  const { items: events, loading, error, refetch } = useEventsRealtime(userId);

  // Gece yarisi asiminda pencere/basliklar bayatlamasin: sekmeye donuste taze "bugun"
  const [dayAnchor, setDayAnchor] = useState(() => startOfDay(new Date()).getTime());

  // Sekmeye her donuste veriyi tazele; realtime gecikse/kesilse bile liste guncel kalir
  useFocusEffect(
    useCallback(() => {
      setDayAnchor(startOfDay(new Date()).getTime());
      refetch();
    }, [refetch])
  );

  const [editing, setEditing] = useState<EventRow | null>(null);
  const [formVisible, setFormVisible] = useState(false);

  const now = useMemo(() => new Date(dayAnchor), [dayAnchor]);

  // Bugunden itibaren 90 gun, baslangic zamanina gore kronolojik gruplar
  const dayGroups = useMemo<DayGroup[]>(() => {
    const windowStart = startOfDay(now);
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
  }, [events, now]);

  // Ay adi kartlarindaki ozet: o aydaki (listelenen) etkinlik sayisi
  const monthCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const g of dayGroups) {
      const key = `${g.date.getFullYear()}-${g.date.getMonth()}`;
      counts.set(key, (counts.get(key) ?? 0) + g.events.length);
    }
    return counts;
  }, [dayGroups]);

  const openEdit = useCallback((ev: EventRow) => {
    setEditing(ev);
    setFormVisible(true);
  }, []);

  const closeForm = useCallback(() => setFormVisible(false), []);

  const handleSubmit = useCallback(
    async (input: EventInput) => {
      if (!editing) return;
      try {
        await updateEvent(editing.id, input);
        refetch();
      } catch (e) {
        throw e instanceof Error ? e : new Error("Güncellenemedi.");
      }
    },
    [editing, refetch]
  );

  // Silme onayi EventFormModal icinde sorulur; burada dogrudan silinir
  const handleDelete = useCallback(async () => {
    if (!editing) return;
    try {
      await deleteEvent(editing.id);
    } catch {
      Alert.alert("Hata", "Etkinlik silinemedi.");
    } finally {
      refetch();
    }
  }, [editing, refetch]);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <Header name={user?.fullName || user?.firstName} />

      {/* Tarih rozetleri + ay kartlari + etkinlik kartlari */}
      <FlatList
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
        data={dayGroups}
        keyExtractor={(g) => g.key}
        ListHeaderComponent={
          // Guncel ayin karti; bos liste durumunda da gorunur, listeyle kayar
          <MonthCard
            label={`${MONTHS_TR[now.getMonth()]} ${now.getFullYear()}`}
            count={
              monthCounts.get(`${now.getFullYear()}-${now.getMonth()}`) ?? 0
            }
            colors={seasonColors(now.getMonth())}
          />
        }
        renderItem={({ item: group, index }) => {
          const today = isToday(group.date);
          const rel = relativeLabel(group.date);
          const prev = index > 0 ? dayGroups[index - 1] : null;
          const isNewMonth =
            index > 0 &&
            (prev!.date.getMonth() !== group.date.getMonth() ||
              prev!.date.getFullYear() !== group.date.getFullYear());
          return (
            <View>
              {isNewMonth && (
                <View className="mt-6">
                  <MonthCard
                    label={`${MONTHS_TR[group.date.getMonth()]} ${group.date.getFullYear()}`}
                    count={
                      monthCounts.get(
                        `${group.date.getFullYear()}-${group.date.getMonth()}`
                      ) ?? 0
                    }
                    colors={seasonColors(group.date.getMonth())}
                  />
                </View>
              )}
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
                      onPress={() => openEdit(ev)}
                    />
                  ))}
                </View>
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
            <EmptyState
              icon={CalendarX2}
              title="Yaklaşan etkinlik yok"
              subtitle="Takvim sekmesinden yeni etkinlik ekleyebilirsin"
            />
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
