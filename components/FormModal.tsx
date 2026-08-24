import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface FormModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSave: () => void;
  saveLabel?: string;
  saving?: boolean;
  /** Kaydet butonunun ALTINDA sabit duran ekstra buton (orn. silme) */
  belowSave?: React.ReactNode;
  children: React.ReactNode;
}

export default function FormModal({
  visible,
  title,
  onClose,
  onSave,
  saveLabel = "Kaydet",
  saving,
  belowSave,
  children,
}: FormModalProps) {
  const insets = useSafeAreaInsets();
  // Modal ayri bir native window acar; safe-area context icinde 0 donebilir.
  // 0 donerse platforma gore makul bir navigasyon cubugu yuksekligi kullan.
  const bottomPad =
    (insets.bottom > 0 ? insets.bottom : Platform.OS === "ios" ? 24 : 48) + 8;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      // Edge-to-edge acikken karartma sistem cubuklarinin altini da kaplasin;
      // aksi halde alt seritte sekmelerin yazilari karartilmadan gorunur
      statusBarTranslucent
      navigationBarTranslucent
    >
      {/* iOS'ta klavye tum overlay'i yukari iter */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View className="flex-1 justify-end bg-black/40">
          <Pressable className="flex-1" onPress={onClose} />
          {/* Kritik olculer inline style'da: className+style birlesme uyumsuzlugu
              riskine karsi max-h/padding burada garanti edilir */}
          <View
            className="bg-white rounded-t-3xl"
            style={{ maxHeight: "90%", paddingBottom: bottomPad }}
          >
            <View className="flex-row items-center justify-between px-5 pt-5 pb-3">
              <Text className="text-xl font-bold text-gray-900">{title}</Text>
              <Pressable onPress={onClose} className="p-1.5 rounded-full bg-gray-100">
                <X size={20} color="#6B7280" />
              </Pressable>
            </View>

            {/* Alanlar kaydirilabilir; Kaydet butonu scroll DIŞINDA sabit durur —
                icerik ne kadar uzun olursa olsun her zaman tam gorunur.
                nestedScrollEnabled: icteki saat tekerleginin kaydini saglar */}
            <ScrollView
              keyboardShouldPersistTaps="handled"
              className="px-5"
              style={{ flexShrink: 1 }}
              nestedScrollEnabled
            >
              {children}
            </ScrollView>

            <View className="px-5 pt-2">
              <Pressable
                onPress={onSave}
                disabled={saving}
                className={`rounded-2xl py-4 items-center ${saving ? "bg-primary/60" : "bg-primary"}`}
              >
                <Text className="text-white font-bold text-base">
                  {saving ? "Kaydediliyor..." : saveLabel}
                </Text>
              </Pressable>
              {/* Sil gibi ikincil islem Kaydet'in altinda, o da sabit gorunur */}
              {belowSave ? <View className="mt-2.5">{belowSave}</View> : null}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
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
