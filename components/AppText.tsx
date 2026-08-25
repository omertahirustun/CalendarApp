import { forwardRef } from "react";
import { Text, TextInput } from "react-native";

/**
 * Sistem yazi boyutu buyutulmus cihazlarda (Ayarlar > Ekran > Yazi boyutu)
 * sabit kutularda son harflerin kesilmesini engellemek icin font
 * olcekleme sinirlanir. 1.0 = hic buyumez; erisilebilirlik icin arttirilabilir.
 */
export const MAX_FONT_SCALE = 1.0;

export const AppText = forwardRef<Text, React.ComponentProps<typeof Text>>(
  function AppText(props, ref) {
    return <Text ref={ref} maxFontSizeMultiplier={MAX_FONT_SCALE} {...props} />;
  }
);

export const AppTextInput = forwardRef<
  TextInput,
  React.ComponentProps<typeof TextInput>
>(function AppTextInput(props, ref) {
  return (
    <TextInput ref={ref} maxFontSizeMultiplier={MAX_FONT_SCALE} {...props} />
  );
});

// Mevcut kodun degismeden calismasi icin ayni isimlerle disa aktar
export { AppText as Text, AppTextInput as TextInput };
