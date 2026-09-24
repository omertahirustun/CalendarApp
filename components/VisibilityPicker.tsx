import {
  View,
  Pressable
} from "react-native";
import { Text } from "./AppText";
import { COLORS } from "../lib/theme";
import { EVENT_VISIBILITY_META, type EventVisibility } from "../lib/types";

interface VisibilityPickerProps {
  value: EventVisibility;
  onChange: (visibility: EventVisibility) => void;
}

const VISIBILITIES: EventVisibility[] = ["corporate", "personal"];

export default function VisibilityPicker({ value, onChange }: VisibilityPickerProps) {
  return (
    <View className="flex-row gap-2">
      {VISIBILITIES.map((visibility) => {
        const meta = EVENT_VISIBILITY_META[visibility];
        const selected = value === visibility;
        return (
          <Pressable
            key={visibility}
            onPress={() => onChange(visibility)}
            className="flex-1 items-center rounded-full px-3.5 py-2"
            style={{
              backgroundColor: selected ? COLORS.primary : "transparent",
              borderWidth: 1.5,
              borderColor: COLORS.primary,
            }}
          >
            <Text
              className="text-sm font-semibold"
              style={{ color: selected ? "#fff" : COLORS.primary }}
            >
              {meta.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
