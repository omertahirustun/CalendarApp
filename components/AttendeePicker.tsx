import { useEffect, useState } from "react";
import { View, Pressable } from "react-native";
import { Text } from "./AppText";
import { Check } from "lucide-react-native";
import { COLORS } from "../lib/theme";
import { fetchProfiles } from "../lib/api";
import type { Profile } from "../lib/types";

interface AttendeePickerProps {
  /** Secili katilimcilarin user_id'leri (etkinligi ekleyen kisi haric) */
  value: string[];
  onChange: (userIds: string[]) => void;
  /** Kendi kendini katilimci olarak secmesin diye disarida birakilir */
  excludeUserId?: string | null;
}

export default function AttendeePicker({ value, onChange, excludeUserId }: AttendeePickerProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchProfiles()
      .then((rows) => {
        if (!cancelled) setProfiles(rows);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const options = profiles.filter((p) => p.user_id !== excludeUserId);

  function toggle(userId: string) {
    onChange(value.includes(userId) ? value.filter((id) => id !== userId) : [...value, userId]);
  }

  if (loading) {
    return <Text className="text-gray-400 text-xs">Yükleniyor...</Text>;
  }

  if (options.length === 0) {
    return <Text className="text-gray-400 text-xs">Henüz başka kullanıcı yok.</Text>;
  }

  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((p) => {
        const selected = value.includes(p.user_id);
        return (
          <Pressable
            key={p.user_id}
            onPress={() => toggle(p.user_id)}
            className="flex-row items-center rounded-full px-3.5 py-2"
            style={{
              backgroundColor: selected ? COLORS.primary : "transparent",
              borderWidth: 1.5,
              borderColor: COLORS.primary,
            }}
          >
            {selected && <Check size={13} color="#fff" style={{ marginRight: 4 }} />}
            <Text className="text-sm font-semibold" style={{ color: selected ? "#fff" : COLORS.primary }}>
              {p.display_name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
