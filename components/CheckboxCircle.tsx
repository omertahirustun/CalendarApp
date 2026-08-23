import { Pressable, View } from "react-native";
import { Check } from "lucide-react-native";

interface CheckboxCircleProps {
  checked: boolean;
  onToggle: () => void;
}

export default function CheckboxCircle({ checked, onToggle }: CheckboxCircleProps) {
  return (
    <Pressable
      onPress={onToggle}
      hitSlop={8}
      className={`w-6 h-6 rounded-full items-center justify-center border-2 ${
        checked ? "bg-success border-success" : "border-gray-300 bg-white"
      }`}
    >
      {checked && <Check size={14} color="#fff" strokeWidth={3} />}
    </Pressable>
  );
}
