import { useEffect, useState } from "react";
import { TextInput, View, Text } from "react-native";
import FormModal, { Field, inputClass } from "./FormModal";
import ColorPicker from "./ColorPicker";
import type { TrackedItemRow } from "../lib/types";

interface TrackedItemFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: {
    title: string;
    note: string | null;
    link: string | null;
    color: string;
  }) => Promise<void>;
  editing?: TrackedItemRow | null;
}

export default function TrackedItemFormModal({
  visible,
  onClose,
  onSubmit,
  editing,
}: TrackedItemFormModalProps) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [link, setLink] = useState("");
  const [color, setColor] = useState<string>("#7C3AED");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    if (editing) {
      setTitle(editing.title);
      setNote(editing.note ?? "");
      setLink(editing.link ?? "");
      setColor(editing.color);
    } else {
      setTitle("");
      setNote("");
      setLink("");
      setColor("#7C3AED");
    }
  }, [visible, editing]);

  async function handleSave() {
    if (!title.trim()) return setError("Başlık gerekli.");
    setSaving(true);
    try {
      await onSubmit({
        title: title.trim(),
        note: note.trim() || null,
        link: link.trim() || null,
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
      title={editing ? "Kaydı Düzenle" : "Yeni Kayıt"}
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
          placeholder="Örn. React Native kursu"
          value={title}
          onChangeText={setTitle}
          placeholderTextColor="#9CA3AF"
        />
      </Field>

      <Field label="Kısa not (opsiyonel)">
        <TextInput
          className={inputClass}
          placeholder="Not..."
          value={note}
          onChangeText={setNote}
          multiline
          placeholderTextColor="#9CA3AF"
        />
      </Field>

      <Field label="Link (opsiyonel)">
        <TextInput
          className={inputClass}
          placeholder="https://..."
          autoCapitalize="none"
          value={link}
          onChangeText={setLink}
          placeholderTextColor="#9CA3AF"
        />
      </Field>

      <Field label="Renk">
        <ColorPicker value={color} onChange={setColor} />
      </Field>
    </FormModal>
  );
}
