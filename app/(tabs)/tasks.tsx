import { useCallback, useMemo, useState } from "react";
import { View, Text, Pressable, TextInput, FlatList, Alert } from "react-native";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { Plus, ListTodo, Search } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Header from "../../components/Header";
import TaskCard from "../../components/TaskCard";
import TaskFormModal from "../../components/TaskFormModal";
import EmptyState from "../../components/EmptyState";
import { useTasksRealtime } from "../../hooks/useTasksRealtime";
import { createTask, deleteTask, updateTask } from "../../lib/api";
import type { TaskRow } from "../../lib/types";

type Filter = "all" | "pending" | "completed";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Tümü" },
  { key: "pending", label: "Bekleyen" },
  { key: "completed", label: "Tamamlanan" },
];

export default function TasksScreen() {
  const { userId } = useAuth();
  const { user } = useUser();
  const { items: tasks, loading, error } = useTasksRealtime(userId);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<TaskRow | null>(null);

  const visible = useMemo(() => {
    let list = tasks;
    if (filter === "pending") list = list.filter((t) => t.status === "pending");
    if (filter === "completed") list = list.filter((t) => t.status === "completed");
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(q));
    }
    return list;
  }, [tasks, filter, query]);

  // Optimistic toggle: UI aninda guncellenir, arka planda Supabase update
  const toggleTask = useCallback(
    (task: TaskRow) => {
      updateTask(task.id, {
        status: task.status === "completed" ? "pending" : "completed",
      }).catch((e) =>
        Alert.alert("Hata", e instanceof Error ? e.message : "Güncellenemedi.")
      );
    },
    []
  );

  const confirmDelete = useCallback((task: TaskRow) => {
    Alert.alert("Görevi Sil", `"${task.title}" silinsin mi?`, [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: () => deleteTask(task.id).catch(() => {}),
      },
    ]);
  }, []);

  async function handleSubmit(input: {
    title: string;
    priority: TaskRow["priority"];
    due_date: string | null;
    color: string;
  }) {
    if (!userId) return;
    if (editing) {
      await updateTask(editing.id, input);
    } else {
      await createTask(userId, input);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <Header name={user?.firstName} />

      <View className="px-4 pb-2">
        {/* Arama */}
        <View className="flex-row items-center bg-white border border-gray-200 rounded-2xl px-4 py-3 mb-3">
          <Search size={18} color="#9CA3AF" />
          <TextInput
            className="flex-1 ml-3 text-base text-gray-900"
            placeholder="Görev ara..."
            value={query}
            onChangeText={setQuery}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Filtre */}
        <View className="flex-row gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                className={`px-4 py-2 rounded-full border ${
                  active ? "bg-primary border-primary" : "bg-white border-gray-200"
                }`}
              >
                <Text className={`text-xs font-bold ${active ? "text-white" : "text-gray-600"}`}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <FlatList
        className="flex-1 px-4 pt-3"
        contentContainerStyle={{ paddingBottom: 96 }}
        data={visible}
        keyExtractor={(t) => t.id}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <Text className="text-gray-400 text-center py-8">Yükleniyor...</Text>
          ) : error ? (
            <Text className="text-danger text-center py-8">{error}</Text>
          ) : (
            <EmptyState
              icon={ListTodo}
              title={query ? "Sonuç bulunamadı" : "Henüz görev yok"}
              subtitle={query ? undefined : "Yeni görev eklemek için + butonuna dokun"}
            />
          )
        }
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            onToggle={() => toggleTask(item)}
            onDelete={() => confirmDelete(item)}
          />
        )}
      />

      <Pressable
        onPress={() => {
          setEditing(null);
          setFormVisible(true);
        }}
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-primary shadow-lg items-center justify-center"
        style={{ shadowColor: "#7C3AED", shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 }}
      >
        <Plus size={28} color="#fff" strokeWidth={2.5} />
      </Pressable>

      <TaskFormModal
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        onSubmit={handleSubmit}
        editing={editing}
      />
    </SafeAreaView>
  );
}
