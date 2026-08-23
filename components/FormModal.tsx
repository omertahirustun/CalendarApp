import { Modal, View, Text, Pressable, ScrollView } from "react-native";
import { X } from "lucide-react-native";

interface FormModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSave: () => void;
  saveLabel?: string;
  saving?: boolean;
  children: React.ReactNode;
}

export default function FormModal({
  visible,
  title,
  onClose,
  onSave,
  saveLabel = "Kaydet",
  saving,
  children,
}: FormModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="bg-white rounded-t-3xl max-h-[90%] pb-8">
          <View className="flex-row items-center justify-between px-5 pt-5 pb-3">
            <Text className="text-xl font-bold text-gray-900">{title}</Text>
            <Pressable onPress={onClose} className="p-1.5 rounded-full bg-gray-100">
              <X size={20} color="#6B7280" />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" className="px-5">
            {children}
            <Pressable
              onPress={onSave}
              disabled={saving}
              className={`rounded-2xl py-4 mt-6 mb-2 items-center ${saving ? "bg-primary/60" : "bg-primary"}`}
            >
              <Text className="text-white font-bold text-base">{saving ? "Kaydediliyor..." : saveLabel}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

interface FieldProps {
  label: string;
  children: React.ReactNode;
}

function Field({ label, children }: FieldProps) {
  return (
    <View className="mb-4">
      <Text className="text-gray-700 font-semibold text-sm mb-2">{label}</Text>
      {children}
    </View>
  );
}

const inputClass =
  "bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-base text-gray-900";

export { Field, inputClass };
