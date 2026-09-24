import { Alert } from "react-native";

export function confirmDeleteEvent(title: string, onConfirm: () => void | Promise<void>) {
  Alert.alert("Etkinliği Sil", `"${title}" silinsin mi?`, [
    { text: "Vazgeç", style: "cancel" },
    {
      text: "Sil",
      style: "destructive",
      onPress: () => void Promise.resolve(onConfirm()),
    },
  ]);
}
