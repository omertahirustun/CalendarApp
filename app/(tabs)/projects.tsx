import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  View,
  Pressable,
  Alert
} from "react-native";
import { Text, TextInput } from "../../components/AppText";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useFocusEffect } from "expo-router";
import { Plus, FolderKanban, Search } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Header from "../../components/Header";
import TrackedItemCard from "../../components/TrackedItemCard";
import TrackedItemFormModal from "../../components/TrackedItemFormModal";
import EmptyState from "../../components/EmptyState";
import { useTrackedItemsRealtime } from "../../hooks/useTrackedItemsRealtime";
import {
  createTrackedItem,
  deleteTrackedItem,
  updateTrackedItem,
} from "../../lib/api";
import type { TrackedItemRow } from "../../lib/types";

export default function ProjectsScreen() {
  const { userId } = useAuth();
  const { user } = useUser();
  const { items: tracked, loading, error, refetch } = useTrackedItemsRealtime(userId);

  // Sekmeye her donuste veriyi tazele; realtime gecikse/kesilse bile liste guncel kalir
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const [query, setQuery] = useState("");
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<TrackedItemRow | null>(null);

  // Sadelestirildi: surukleme kaldirildi; siralama sunucudan gelen sort_order
  const ordered = tracked;

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
  const toggleItem = useCallback(
    (item: TrackedItemRow) => {
      updateTrackedItem(item.id, {
        status: item.status === "completed" ? "pending" : "completed",
      })
        .then(() => refetch())
        .catch((e) =>
          Alert.alert("Hata", e instanceof Error ? e.message : "Güncellenemedi.")
        );
    },
    [refetch]
  );

  // Basliga dokunulan kaydi duzenleme modunda acar
  const openEdit = useCallback((item: TrackedItemRow) => {
    setEditing(item);
    setFormVisible(true);
  }, []);

  const confirmDelete = useCallback(
    (item: TrackedItemRow) => {
      Alert.alert("Kaydı Sil", `"${item.title}" silinsin mi?`, [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: () =>
            deleteTrackedItem(item.id)
              .then(() => refetch())
              .catch(() => Alert.alert("Hata", "Kayıt silinemedi.")),
        },
      ]);
    },
    [refetch]
  );

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
    refetch();
  }

  // Tek duz liste render'i; arama filtresiyle ayni
  const renderItem = useCallback(
    ({ item }: { item: TrackedItemRow }) => (
      <TrackedItemCard
        item={item}
        onToggle={toggleItem}
        onDelete={confirmDelete}
        onEdit={openEdit}
      />
    ),
    [toggleItem, confirmDelete, openEdit]
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
      <Header
        name={user?.fullName || user?.firstName}
        title="Projeler / Takip Listesi"
      />

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
        <FlatList
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 96 }}
          data={visible}
          keyExtractor={(t) => t.id}
          renderItem={renderItem}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={11}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={listEmpty}
        />
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
