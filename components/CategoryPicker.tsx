import {
  View,
  Pressable
} from "react-native";
import { Text } from "./AppText";
import { EVENT_CATEGORY_META, type EventCategory } from "../lib/types";

interface CategoryPickerProps {
  value: EventCategory;
  onChange: (category: EventCategory) => void;
}

const CATEGORIES = Object.keys(EVENT_CATEGORY_META) as EventCategory[];

export default function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {CATEGORIES.map((category) => {
        const meta = EVENT_CATEGORY_META[category];
        const selected = value === category;
        return (
          <Pressable
            key={category}
            onPress={() => onChange(category)}
            className="flex-row items-center rounded-full px-3.5 py-2"
            style={{
              backgroundColor: selected ? meta.color : "transparent",
              borderWidth: 1.5,
              borderColor: meta.color,
            }}
          >
            <Text className="text-sm">{meta.emoji}</Text>
            <Text
              className="text-sm font-semibold ml-1.5"
              style={{ color: selected ? "#fff" : meta.color }}
            >
              {meta.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
