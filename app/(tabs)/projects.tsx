import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, View, Text, Pressable, TextInput, Alert } from "react-native";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { Plus, FolderKanban, Search } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DragList, {
  type DragListRenderItemInfo,
} from "react-native-draglist";

import Header from "../../components/Header";
import TrackedItemCard from "../../components/TrackedItemCard";
import TrackedItemFormModal from "../../components/TrackedItemFormModal";
import EmptyState from "../../components/EmptyState";
import { useTrackedItemsRealtime } from "../../hooks/useTrackedItemsRealtime";
import {
  createTrackedItem,
  deleteTrackedItem,
  reorderTrackedItems,
  updateTrackedItem,
} from "../../lib/api";
import type { TrackedItemRow } from "../../lib/types";

// Surukleme sirasinda kart vurgusu — her render'da yeni obje olusmasin diye sabit
const DRAG_ACTIVE_STYLE = {
  shadowColor: "#2D26F0",
  shadowOpacity: 0.25,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 8,
};

export default function ProjectsScreen() {
  const { userId } = useAuth();
  const { user } = useUser();
  const { items: tracked, loading, error } = useTrackedItemsRealtime(userId);

  const [query, setQuery] = useState("");
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<TrackedItemRow | null>(null);
  // Sunucu yazimi tamamlanana kadar suruklenen sirayi optimistik tutar
  const [dragOrder, setDragOrder] = useState<string[] | null>(null);

  // Optimistik siralama override'u; sunucu ayni sirayi dondugunde temizlenir
  const ordered = useMemo(() => {
    if (!dragOrder) return tracked;
    const map = new Map(tracked.map((t) => [t.id, t]));
    const sorted = dragOrder
      .map((id) => map.get(id))
      .filter((t): t is TrackedItemRow => Boolean(t));
    const rest = tracked.filter((t) => !dragOrder.includes(t.id));
    return [...sorted, ...rest];
  }, [tracked, dragOrder]);

  useEffect(() => {
    if (!dragOrder) return;
    if (tracked.map((t) => t.id).join(",") === dragOrder.join(",")) {
      setDragOrder(null);
    }
  }, [tracked, dragOrder]);

  const visible = useMemo(() => {
    if (!query.trim()) return ordered;
    const q = query.trim().toLowerCase();
    return ordered.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.note ?? "").toLowerCase().includes(q)
    );
  }, [ordered, query]);

  // Optimistic toggle — sadece status; sort_order'a dokunmaz, kart yerinde kalir
  const toggleItem = useCallback((item: TrackedItemRow) => {
    updateTrackedItem(item.id, {
      status: item.status === "completed" ? "pending" : "completed",
    }).catch((e) =>
      Alert.alert("Hata", e instanceof Error ? e.message : "Güncellenemedi.")
    );
  }, []);

  const confirmDelete = useCallback((item: TrackedItemRow) => {
    Alert.alert("Kaydı Sil", `"${item.title}" silinsin mi?`, [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: () => deleteTrackedItem(item.id).catch(() => {}),
      },
    ]);
  }, []);

  async function handleSubmit(input: {
    title: string;
    note: string | null;
    link: string | null;
    color: string;
  }) {
    if (!userId) return;
    if (editing) {
      await updateTrackedItem(editing.id, input);
    } else {
      await createTrackedItem(userId, input);
    }
  }

  // Arama varken (filtreli/kismi liste) suruklemeyi kapat
  const dragEnabled = !query.trim();

  // Surukleme bitince yeni sirayi ANINDA local state'e yansit; rpc'yi bekleme.
  // DragList bu fonksiyon bitene kadar arayuzu surukleme modunda tutar — network
  // beklersek kartlar yanlis konumda takili kalir, sonra ziplayarak duzelir.
  const handleReordered = useCallback(
    (fromIndex: number, toIndex: number) => {
      const copy = [...ordered];
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);
      const ids = copy.map((t) => t.id);
      setDragOrder(ids);
      if (!userId) return;
      reorderTrackedItems(userId, ids).catch(() => {
        Alert.alert("Hata", "Sıralama kaydedilemedi.");
        setDragOrder(null); // hata durumunda eski siraya don
      });
    },
    [ordered, userId]
  );

  // Arama modunda surukleme yok — sade liste
  const renderPlainItem = useCallback(
    ({ item }: { item: TrackedItemRow }) => (
      <TrackedItemCard item={item} onToggle={toggleItem} onDelete={confirmDelete} />
    ),
    [toggleItem, confirmDelete]
  );

  const renderDragItem = useCallback(
    (info: DragListRenderItemInfo<TrackedItemRow>) => {
      const { item, isActive, onDragStart, onDragEnd } = info;
      return (
        <Pressable
          onLongPress={onDragStart}
          onPressOut={onDragEnd}
          disabled={isActive}
          style={isActive ? DRAG_ACTIVE_STYLE : undefined}
          delayLongPress={250}
        >
          <TrackedItemCard item={item} onToggle={toggleItem} onDelete={confirmDelete} />
        </Pressable>
      );
    },
    [toggleItem, confirmDelete]
  );

  const listEmpty = loading ? (
    <Text className="text-gray-400 text-center py-8">Yükleniyor...</Text>
  ) : error ? (
    <Text className="text-danger text-center py-8">{error}</Text>
  ) : (
    <EmptyState
      icon={FolderKanban}
      title={query ? "Sonuç bulunamadı" : "Takip listesi boş"}
      subtitle={
        query ? undefined : "İzlediğin işleri, kursları, projeleri buraya ekle"
      }
    />
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <Header name={user?.firstName} title="Projeler / Takip Listesi" />

      <View className="px-4 pb-2">
        {/* Arama */}
        <View className="flex-row items-center bg-white border border-gray-200 rounded-2xl px-4 py-3">
          <Search size={18} color="#9CA3AF" />
          <TextInput
            className="flex-1 ml-3 text-base text-gray-900"
            placeholder="Başlık veya notta ara..."
            value={query}
            onChangeText={setQuery}
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </View>

      <View className="flex-1 px-4 pt-4">
        {dragEnabled ? (
          <DragList
            // containerStyle sarmalayici View'a uygulanir — vermezsek icteki
            // flex:1 liste yuksekligi 0'a coker ve HICBIR SEY gorunmez!
            containerStyle={{ flex: 1 }}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 96 }}
            data={visible}
            keyExtractor={(t) => t.id}
            onReordered={handleReordered}
            renderItem={renderDragItem}
            initialNumToRender={15}
            maxToRenderPerBatch={10}
            windowSize={11}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={listEmpty}
          />
        ) : (
          <FlatList
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 96 }}
            data={visible}
            keyExtractor={(t) => t.id}
            renderItem={renderPlainItem}
            initialNumToRender={15}
            maxToRenderPerBatch={10}
            windowSize={11}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={listEmpty}
          />
        )}
      </View>

      <Pressable
        onPress={() => {
          setEditing(null);
          setFormVisible(true);
        }}
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-primary shadow-lg items-center justify-center"
        style={{ shadowColor: "#2D26F0", shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 }}
      >
        <Plus size={28} color="#fff" strokeWidth={2.5} />
      </Pressable>

      <TrackedItemFormModal
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        onSubmit={handleSubmit}
        editing={editing}
      />
    </SafeAreaView>
  );
}
