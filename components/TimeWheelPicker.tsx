import { useEffect, useMemo, useRef } from "react";
import {
  ScrollView,
  View
} from "react-native";
import { Text } from "./AppText";

const ITEM_H = 40;
const VISIBLE_ITEMS = 5;
const CONTAINER_H = ITEM_H * VISIBLE_ITEMS;
const PAD_Y = (CONTAINER_H - ITEM_H) / 2;

interface WheelProps {
  items: number[];
  value: number;
  onSelect: (n: number) => void;
}

/** Tek eksen kaydirilabilir tekerlek; ortadaki deger secili */
function Wheel({ items, value, onSelect }: WheelProps) {
  const ref = useRef<ScrollView>(null);
  // Kendi yaydigi degisiklikte yeniden konumlanmayi onler
  const lastEmitted = useRef(value);

  // Ilk montajda mevcut degere konumlan
  useEffect(() => {
    const idx = Math.max(0, items.indexOf(value));
    requestAnimationFrame(() => {
      ref.current?.scrollTo({ y: idx * ITEM_H, animated: false });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Disaridan gelen degisim (orn. duzenleme modunda deger yukleme)
  useEffect(() => {
    if (value === lastEmitted.current) return;
    const idx = items.indexOf(value);
    if (idx < 0) return;
    lastEmitted.current = value;
    ref.current?.scrollTo({ y: idx * ITEM_H, animated: true });
  }, [value, items]);

  return (
    <View className="relative">
      {/* Orta secim bandi — tekerlegin arkasinda */}
      <View
        pointerEvents="none"
        className="absolute inset-x-2 bg-gray-100 rounded-xl"
        style={{ top: PAD_Y, height: ITEM_H }}
      />
      {/* KRITIK: ScrollView KENDI yüksekligini bilmeli; sarmalayicida birakirsak
          icerik kadar uzar ve hic kaymaz */}
      <ScrollView
        ref={ref}
        style={{ height: CONTAINER_H }}
        className="rounded-2xl"
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        nestedScrollEnabled
        contentContainerStyle={{ paddingVertical: PAD_Y }}
        onMomentumScrollEnd={(e) => {
          const raw = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
          const idx = Math.min(items.length - 1, Math.max(0, raw));
          const v = items[idx];
          if (v !== undefined && v !== lastEmitted.current) {
            lastEmitted.current = v;
            onSelect(v);
          }
        }}
      >
        {items.map((n) => (
          <View key={n} style={{ height: ITEM_H }} className="items-center justify-center">
            <Text
              className={`text-lg ${n === value ? "font-bold text-primary" : "text-gray-500"}`}
            >
              {String(n).padStart(2, "0")}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

interface TimeWheelPickerProps {
  /** "HH:MM" formatinda deger */
  value: string;
  onChange: (next: string) => void;
}

/**
 * Alarm uygulamalarindaki gibi yana yana iki kaydirilabilir tekerlek:
 * saat (00-23) + dakika (00-59). Klavye girişi yok.
 */
export default function TimeWheelPicker({ value, onChange }: TimeWheelPickerProps) {
  const [hStr, mStr] = value.split(":");
  const hour = Math.min(23, Math.max(0, parseInt(hStr ?? "0", 10) || 0));
  const minute = Math.min(59, Math.max(0, parseInt(mStr ?? "0", 10) || 0));

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);

  return (
    <View className="flex-row items-center gap-2">
      <View className="flex-1">
        <Wheel
          items={hours}
          value={hour}
          onSelect={(h) =>
            onChange(`${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`)
          }
        />
      </View>
      <Text className="text-xl font-bold text-gray-400">:</Text>
      <View className="flex-1">
        <Wheel
          items={minutes}
          value={minute}
          onSelect={(m) =>
            onChange(`${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")}`)
          }
        />
      </View>
    </View>
  );
}
