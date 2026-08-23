import { useEffect, useState } from "react";
import { TextInput, View, Text, Pressable } from "react-native";
import FormModal, { Field, inputClass } from "./FormModal";
import ColorPicker from "./ColorPicker";
import CalendarGrid from "./CalendarGrid";
import {
  addDays,
  combineDateTime,
  isSameDay,
  addMonths,
  MONTHS_TR,
} from "../lib/date";
import type { Priority, TaskRow } from "../lib/types";

interface TaskFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: {
    title: string;
    priority: Priority;
    due_date: string | null;
    color: string;
  }) => Promise<void>;
  editing?: TaskRow | null;
}

const PRIORITIES: { key: Priority; label: string; color: string }[] = [
  { key: "high", label: "Yüksek", color: "#EF4444" },
  { key: "medium", label: "Orta", color: "#F59E0B" },
  { key: "low", label: "Düşük", color: "#10B981" },
];

export default function TaskFormModal({ visible, onClose, onSubmit, editing }: TaskFormModalProps) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [hasDue, setHasDue] = useState(false);
  const [dueDay, setDueDay] = useState<Date>(() => new Date());
  const [dueTime, setDueTime] = useState("18:00");
  const [showCalendar, setShowCalendar] = useState(false);
  const [calMonth, setCalMonth] = useState<Date>(() => new Date());
  const [color, setColor] = useState<string>("#7C3AED");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setShowCalendar(false);
    if (editing) {
      setTitle(editing.title);
      setPriority(editing.priority);
      setColor(editing.color);
      if (editing.due_date) {
        const d = new Date(editing.due_date);
        setHasDue(true);
        setDueDay(d);
        setCalMonth(d);
        setDueTime(
          `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
        );
      } else {
        setHasDue(false);
        setDueDay(new Date());
        setCalMonth(new Date());
        setDueTime("18:00");
      }
    } else {
      setTitle("");
      setPriority("medium");
      setHasDue(false);
      setDueDay(new Date());
      setCalMonth(new Date());
      setDueTime("18:00");
      setColor("#7C3AED");
    }
  }, [visible, editing]);

  async function handleSave() {
    if (!title.trim()) return setError("Başlık gerekli.");
    let dueDate: string | null = null;
    if (hasDue) {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(dueTime))
        return setError("Saat SS:DD formatında olmalı.");
      dueDate = combineDateTime(dueDay, dueTime.trim());
    }

    setSaving(true);
    try {
      await onSubmit({ title: title.trim(), priority, due_date: dueDate, color });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  function quickChipLabel(offset: number): string {
    if (offset === 0) return "Bugün";
    if (offset === 1) return "Yarın";
    return dayChipLabel(addDays(new Date(), offset));
  }

  function dayChipLabel(d: Date): string {
    return `${d.getDate()} ${MONTHS_TR[d.getMonth()]}`;
  }

  return (
    <FormModal
      visible={visible}
      title={editing ? "Görevi Düzenle" : "Yeni Görev"}
      onClose={onClose}
      onSave={handleSave}
      saving={saving}
    >
      {error && (
        <View className="bg-red-50 border border-red-200 rounded-2xl px-4 py-2.5 mb-4">
          <Text className="text-danger text-sm">{error}</Text>
        </View>
      )}

      <Field label="Başlık">
        <TextInput
          className={inputClass}
          placeholder="Örn. Raporu tamamla"
          value={title}
          onChangeText={setTitle}
          placeholderTextColor="#9CA3AF"
        />
      </Field>

      <Field label="Öncelik">
        <View className="flex-row gap-2">
          {PRIORITIES.map((p) => {
            const active = priority === p.key;
            return (
              <Pressable
                key={p.key}
                onPress={() => setPriority(p.key)}
                className={`flex-1 py-2.5 rounded-xl items-center border ${
                  active ? "" : "border-gray-200 bg-gray-50"
                }`}
                style={
                  active ? { backgroundColor: p.color + "22", borderColor: p.color } : undefined
                }
              >
                <Text className="font-bold text-sm" style={{ color: active ? p.color : "#6B7280" }}>
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Field>

      <Field label="Son tarih">
        <View className="flex-row flex-wrap gap-2 mb-3">
          {[0, 1].map((offset) => {
            const active = hasDue && isSameDay(dueDay, addDays(new Date(), offset)) && !showCalendar;
            return (
              <Pressable
                key={offset}
                onPress={() => {
                  setHasDue(true);
                  setDueDay(addDays(new Date(), offset));
                  setShowCalendar(false);
                }}
                className={`px-3 py-2 rounded-full border ${
                  active ? "bg-primary border-primary" : "bg-gray-50 border-gray-200"
                }`}
              >
                <Text className={`text-xs font-semibold ${active ? "text-white" : "text-gray-600"}`}>
                  {quickChipLabel(offset)}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => setShowCalendar((s) => !s)}
            className={`px-3 py-2 rounded-full border ${
              showCalendar || (hasDue && !isSameDay(dueDay, new Date()) && !isSameDay(dueDay, addDays(new Date(), 1)))
                ? "bg-primary border-primary"
                : "bg-gray-50 border-gray-200"
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                showCalendar ||
                (hasDue && !isSameDay(dueDay, new Date()) && !isSameDay(dueDay, addDays(new Date(), 1)))
                  ? "text-white"
                  : "text-gray-600"
              }`}
            >
              📅 Takvimden seç
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setHasDue(false)}
            className={`px-3 py-2 rounded-full border ${
              !hasDue ? "bg-gray-900 border-gray-900" : "bg-gray-50 border-gray-200"
            }`}
          >
            <Text className={`text-xs font-semibold ${!hasDue ? "text-white" : "text-gray-600"}`}>
              Yok
            </Text>
          </Pressable>
        </View>

        {!hasDue && showCalendar && (
          <Text className="text-gray-400 text-xs mb-3">Tarih seçilmedi — gün seçmek için takvimi kullan</Text>
        )}

        {showCalendar && (
          <View className="border border-gray-200 bg-white rounded-2xl px-2 pt-2 pb-3 mb-3">
            <View className="flex-row items-center justify-between mb-1">
              <Pressable
                onPress={() => setCalMonth(addMonths(calMonth, -1))}
                className="w-9 h-9 items-center justify-center rounded-full"
              >
                <Text className="text-primary text-xl font-bold">‹</Text>
              </Pressable>
              <Text className="text-sm font-bold text-gray-900">
                {MONTHS_TR[calMonth.getMonth()]} {calMonth.getFullYear()}
              </Text>
              <Pressable
                onPress={() => setCalMonth(addMonths(calMonth, 1))}
                className="w-9 h-9 items-center justify-center rounded-full"
              >
                <Text className="text-primary text-xl font-bold">›</Text>
              </Pressable>
            </View>
            <CalendarGrid
              monthDate={calMonth}
              selectedDate={hasDue ? dueDay : new Date()}
              dots={{}}
              onSelectDay={(d) => {
                setHasDue(true);
                setDueDay(d);
                setCalMonth(d);
                setShowCalendar(false);
              }}
            />
          </View>
        )}

        {hasDue && (
          <>
            {!showCalendar && (
              <Text className="text-gray-500 text-xs mb-2">
                Seçili: {dayChipLabel(dueDay)}
              </Text>
            )}
            <TextInput
              className={inputClass}
              placeholder="18:00"
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              value={dueTime}
              onChangeText={(t) => setDueTime(t.replace(/[^0-9:]/g, ""))}
              placeholderTextColor="#9CA3AF"
            />
          </>
        )}
      </Field>

      <Field label="Renk">
        <ColorPicker value={color} onChange={setColor} />
      </Field>
    </FormModal>
  );
}
