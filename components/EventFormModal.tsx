import { useEffect, useState } from "react";
import { TextInput, View, Text } from "react-native";
import FormModal, { Field, inputClass } from "./FormModal";
import ColorPicker from "./ColorPicker";
import { isValidTime } from "../lib/date";
import type { EventRow } from "../lib/types";

interface EventFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: {
    title: string;
    description: string | null;
    start_time: string;
    end_time: string;
    location: string | null;
    color: string;
  }) => Promise<void>;
  /** Duzenleme modunda mevcut event */
  editing?: EventRow | null;
  /** Yeni event icin secili gun (yerel) */
  baseDate?: Date;
}

export default function EventFormModal({
  visible,
  onClose,
  onSubmit,
  editing,
  baseDate,
}: EventFormModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [color, setColor] = useState<string>("#7C3AED");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    if (editing) {
      const s = new Date(editing.start_time);
      const e = new Date(editing.end_time);
      setTitle(editing.title);
      setDescription(editing.description ?? "");
      setLocation(editing.location ?? "");
      setStartTime(`${String(s.getHours()).padStart(2, "0")}:${String(s.getMinutes()).padStart(2, "0")}`);
      setEndTime(`${String(e.getHours()).padStart(2, "0")}:${String(e.getMinutes()).padStart(2, "0")}`);
      setColor(editing.color);
    } else {
      setTitle("");
      setDescription("");
      setLocation("");
      setStartTime("09:00");
      setEndTime("10:00");
      setColor("#7C3AED");
    }
  }, [visible, editing]);

  async function handleSave() {
    const day = editing ? new Date(editing.start_time) : baseDate ?? new Date();
    if (!title.trim()) return setError("Başlık gerekli.");
    if (!isValidTime(startTime)) return setError("Başlangıç saati SS:DD formatında olmalı.");
    if (!isValidTime(endTime)) return setError("Bitiş saati SS:DD formatında olmalı.");

    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), sh, sm);
    let end = new Date(day.getFullYear(), day.getMonth(), day.getDate(), eh, em);
    if (end <= start) end = new Date(end.getTime() + 24 * 60 * 60 * 1000);

    setSaving(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        location: location.trim() || null,
        color,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormModal
      visible={visible}
      title={editing ? "Etkinliği Düzenle" : "Yeni Etkinlik"}
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
          placeholder="Örn. Toplantı"
          value={title}
          onChangeText={setTitle}
          placeholderTextColor="#9CA3AF"
        />
      </Field>

      <Field label="Açıklama (opsiyonel)">
        <TextInput
          className={inputClass}
          placeholder="Notlar..."
          value={description}
          onChangeText={setDescription}
          multiline
          placeholderTextColor="#9CA3AF"
        />
      </Field>

      <Field label="Konum (opsiyonel)">
        <TextInput
          className={inputClass}
          placeholder="Örn. Ofis"
          value={location}
          onChangeText={setLocation}
          placeholderTextColor="#9CA3AF"
        />
      </Field>

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Field label="Başlangıç saati">
            <TextInput
              className={inputClass}
              placeholder="09:00"
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              value={startTime}
              onChangeText={(t) => setStartTime(t.replace(/[^0-9:]/g, ""))}
              placeholderTextColor="#9CA3AF"
            />
          </Field>
        </View>
        <View className="flex-1">
          <Field label="Bitiş saati">
            <TextInput
              className={inputClass}
              placeholder="10:00"
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              value={endTime}
              onChangeText={(t) => setEndTime(t.replace(/[^0-9:]/g, ""))}
              placeholderTextColor="#9CA3AF"
            />
          </Field>
        </View>
      </View>

      <Field label="Renk">
        <ColorPicker value={color} onChange={setColor} />
      </Field>
    </FormModal>
  );
}
