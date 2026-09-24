import { useEffect, useState } from "react";
import {
  View,
  Pressable
} from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import { Text, TextInput } from "./AppText";
import { Trash2, ChevronLeft, ChevronRight, Clock } from "lucide-react-native";
import FormModal, { Field, inputClass } from "./FormModal";
import ColorPicker from "./ColorPicker";
import CategoryPicker from "./CategoryPicker";
import VisibilityPicker from "./VisibilityPicker";
import AttendeePicker from "./AttendeePicker";
import TimeWheelPicker from "./TimeWheelPicker";
import { addDays, formatFullDate, isValidTime, normalizeTime, startOfDay } from "../lib/date";
import { EVENT_CATEGORY_META, type EventRow, type EventCategory, type EventVisibility } from "../lib/types";
import { confirmDeleteEvent } from "../lib/confirmDeleteEvent";
import type { EventInput } from "../lib/api";

interface EventFormModalProps {
  visible: boolean;
  onClose: () => void;
  /** created_by_name modal tarafinda null gonderilir; cagiran ekran doldurur */
  onSubmit: (input: EventInput) => Promise<void>;
  /** Sadece duzenleme modunda gorunen Sil butonunun silme isi; verilmezse buton gizlenir */
  onDelete?: () => void | Promise<void>;
  /** Duzenleme modunda mevcut event */
  editing?: EventRow | null;
  /** Yeni event icin secili gun (yerel) */
  baseDate?: Date;
}

export default function EventFormModal({
  visible,
  onClose,
  onSubmit,
  onDelete,
  editing,
  baseDate,
}: EventFormModalProps) {
  const { userId } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  // Etkinligin tarih araligi: olusturmada secili gun, duzenlemede mevcut aralik; oklarla degisir
  const [startDay, setStartDay] = useState(() => (baseDate ? new Date(baseDate) : new Date()));
  const [endDay, setEndDay] = useState(() => (baseDate ? new Date(baseDate) : new Date()));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [color, setColor] = useState<string>("#2D26F0");
  const [category, setCategory] = useState<EventCategory>("other");
  const [visibility, setVisibility] = useState<EventVisibility>("corporate");
  const [attendeeUserIds, setAttendeeUserIds] = useState<string[]>([]);
  // Saat tekerlegi yalnizca ilgili alana dokununca acilir
  const [activeWheel, setActiveWheel] = useState<"start" | "end" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setActiveWheel(null);
    if (editing) {
      const s = new Date(editing.start_time);
      const e = new Date(editing.end_time);
      setTitle(editing.title);
      setDescription(editing.description ?? "");
      setLocation(editing.location ?? "");
      setStartDay(startOfDay(s));
      setEndDay(startOfDay(e));
      setStartTime(`${String(s.getHours()).padStart(2, "0")}:${String(s.getMinutes()).padStart(2, "0")}`);
      setEndTime(`${String(e.getHours()).padStart(2, "0")}:${String(e.getMinutes()).padStart(2, "0")}`);
      setColor(editing.color);
      setCategory(editing.category ?? "other");
      setVisibility(editing.visibility ?? "corporate");
      setAttendeeUserIds((editing.attendees ?? []).map((a) => a.user_id));
    } else {
      setTitle("");
      setDescription("");
      setLocation("");
      setStartDay(baseDate ? new Date(baseDate) : new Date());
      setEndDay(baseDate ? new Date(baseDate) : new Date());
      setStartTime("09:00");
      setEndTime("10:00");
      setColor("#2D26F0");
      setCategory("other");
      setVisibility("corporate");
      setAttendeeUserIds([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, editing]);

  // Kategori secilince kategorinin varsayilan rengi color'a onerilir;
  // kullanici istersen ColorPicker'dan degistirebilir.
  function handleCategoryChange(next: EventCategory) {
    setCategory(next);
    setColor(EVENT_CATEGORY_META[next].color);
  }

  function handleDelete() {
    if (!editing || !onDelete) return;
    // Silme hatasi cagiran ekranda Alert ile gosterilir; modal yine kapanir
    confirmDeleteEvent(editing.title, () => Promise.resolve(onDelete()).finally(() => onClose()));
  }

  async function handleSave() {
    if (!title.trim()) return setError("Başlık gerekli.");
    if (!isValidTime(startTime)) return setError("Başlangıç saati SS:DD formatında olmalı.");
    if (!isValidTime(endTime)) return setError("Bitiş saati SS:DD formatında olmalı.");

    const [sh, sm] = normalizeTime(startTime).split(":").map(Number);
    const [eh, em] = normalizeTime(endTime).split(":").map(Number);
    const start = new Date(startDay.getFullYear(), startDay.getMonth(), startDay.getDate(), sh, sm);
    const end = new Date(endDay.getFullYear(), endDay.getMonth(), endDay.getDate(), eh, em);
    // Bitis baslangictan once olamaz (gunduz + saat birlikte karsilastirilir)
    if (end <= start) {
      return setError("Bitiş tarih/saati başlangıçtan sonra olmalı.");
    }

    setSaving(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        location: location.trim() || null,
        color,
        category,
        visibility,
        created_by_name: null,
        attendee_user_ids: attendeeUserIds,
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
      belowSave={
        editing && onDelete ? (
          <Pressable
            onPress={handleDelete}
            className="flex-row items-center justify-center rounded-2xl border border-red-200 bg-red-50 py-3"
          >
            <Trash2 size={18} color="#EF4444" />
            <Text className="text-danger font-semibold ml-2">Etkinliği Sil</Text>
          </Pressable>
        ) : null
      }
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

      <Field label="Görünürlük">
        <VisibilityPicker value={visibility} onChange={setVisibility} />
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

      <Field label="Kiminle (opsiyonel)">
        <AttendeePicker value={attendeeUserIds} onChange={setAttendeeUserIds} excludeUserId={userId} />
      </Field>

      <Field label="Başlangıç Tarihi">
        <View className="flex-row items-center justify-between bg-gray-50 border border-gray-200 rounded-2xl px-2 py-2">
          <Pressable
            onPress={() => setStartDay(addDays(startDay, -1))}
            className="w-9 h-9 rounded-full bg-white border border-gray-200 items-center justify-center"
          >
            <ChevronLeft size={18} color="#374151" />
          </Pressable>
          <Text className="text-gray-900 font-semibold text-sm">{formatFullDate(startDay)}</Text>
          <Pressable
            onPress={() => setStartDay(addDays(startDay, 1))}
            className="w-9 h-9 rounded-full bg-white border border-gray-200 items-center justify-center"
          >
            <ChevronRight size={18} color="#374151" />
          </Pressable>
        </View>
      </Field>

      <Field label="Bitiş Tarihi">
        <View className="flex-row items-center justify-between bg-gray-50 border border-gray-200 rounded-2xl px-2 py-2">
          <Pressable
            onPress={() => setEndDay(addDays(endDay, -1))}
            className="w-9 h-9 rounded-full bg-white border border-gray-200 items-center justify-center"
          >
            <ChevronLeft size={18} color="#374151" />
          </Pressable>
          <Text className="text-gray-900 font-semibold text-sm">{formatFullDate(endDay)}</Text>
          <Pressable
            onPress={() => setEndDay(addDays(endDay, 1))}
            className="w-9 h-9 rounded-full bg-white border border-gray-200 items-center justify-center"
          >
            <ChevronRight size={18} color="#374151" />
          </Pressable>
        </View>
      </Field>

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Field label="Başlangıç saati">
            <Pressable
              onPress={() =>
                setActiveWheel(activeWheel === "start" ? null : "start")
              }
              className={`${inputClass} flex-row items-center justify-between ${activeWheel === "start" ? "border-primary" : ""}`}
            >
              <Text className="text-base text-gray-900 flex-1">{startTime}</Text>
              <Clock size={18} color="#6B7280" />
            </Pressable>
          </Field>
        </View>
        <View className="flex-1">
          <Field label="Bitiş saati">
            <Pressable
              onPress={() =>
                setActiveWheel(activeWheel === "end" ? null : "end")
              }
              className={`${inputClass} flex-row items-center justify-between ${activeWheel === "end" ? "border-primary" : ""}`}
            >
              <Text className="text-base text-gray-900 flex-1">{endTime}</Text>
              <Clock size={18} color="#6B7280" />
            </Pressable>
          </Field>
        </View>
      </View>

      {/* Tekerlek yalnizca secili alan icin, alanin hemen altinda acilir */}
      {activeWheel && (
        <View className="mb-4">
          <TimeWheelPicker
            value={activeWheel === "start" ? startTime : endTime}
            onChange={activeWheel === "start" ? setStartTime : setEndTime}
          />
        </View>
      )}

      <Field label="Kategori">
        <CategoryPicker value={category} onChange={handleCategoryChange} />
      </Field>

      <Field label="Renk">
        {visibility === "personal" ? (
          <Text className="text-gray-400 text-xs">
            Kişisel etkinlikler tek renkte gösterilir.
          </Text>
        ) : (
          <ColorPicker value={color} onChange={setColor} />
        )}
      </Field>
    </FormModal>
  );
}
