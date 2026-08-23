import { View, Pressable } from "react-native";
import { Check } from "lucide-react-native";
import { PALETTE } from "../lib/types";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export default function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <View className="flex-row flex-wrap gap-3">
      {PALETTE.map((color) => {
        const selected = value === color;
        return (
          <Pressable
            key={color}
            onPress={() => onChange(color)}
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{
              backgroundColor: color,
              borderWidth: selected ? 3 : 0,
              borderColor: selected ? "#312E81" : "transparent",
            }}
          >
            {selected && <Check size={16} color="#fff" strokeWidth={3} />}
          </Pressable>
        );
      })}
    </View>
  );
}
