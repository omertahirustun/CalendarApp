import { forwardRef } from "react";
import { Platform, Text, TextInput } from "react-native";

/**
 * Sistem yazi boyutu buyutulmus cihazlarda (Ayarlar > Ekran > Yazi boyutu)
 * sabit kutularda son harflerin kesilmesini engellemek icin font
 * olcekleme sinirlanir. 1.0 = hic buyumez; erisilebilirlik icin arttirilabilir.
 *
 * Android'de textBreakStrategy="simple" ile native TextView render ve JS tarafindaki
 * metin olcum farkindan kaynaklanan karakter/kelime kirpma bug'u onlenir.
 * Ayrica ellipsizeMode="tail" varsayilan olarak eklenir (numberOfLines ile birlikte
 * kullanildiginda nokta ekler, yoksa zararsizdir). Her iki prop da spread ile override edilebilir.
 */
export const MAX_FONT_SCALE = 1.0;

const ANDROID_TEXT_BREAK: React.ComponentProps<typeof Text>["textBreakStrategy"] =
  Platform.OS === "android" ? "simple" : undefined;

export const AppText = forwardRef<Text, React.ComponentProps<typeof Text>>(
  function AppText({ ellipsizeMode, ...props }, ref) {
    return (
      <Text
        ref={ref}
        maxFontSizeMultiplier={MAX_FONT_SCALE}
        textBreakStrategy={ANDROID_TEXT_BREAK}
        ellipsizeMode={ellipsizeMode ?? "tail"}
        {...props}
      />
    );
  }
);

export const AppTextInput = forwardRef<
  TextInput,
  React.ComponentProps<typeof TextInput>
>(function AppTextInput(props, ref) {
  return (
    <TextInput
      ref={ref}
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      textBreakStrategy={ANDROID_TEXT_BREAK}
      {...props}
    />
  );
});

// Mevcut kodun degismeden calismasi icin ayni isimlerle disa aktar
export { AppText as Text, AppTextInput as TextInput };
