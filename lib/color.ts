/** Hex rengin parlakligina gore beyaz veya koyu metin rengi dondurur (YIQ formulu) */
export function contrastTextColor(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const luminance = (r * 299 + g * 587 + b * 114) / 1000;
  return luminance > 210 ? "#1F2937" : "#FFFFFF";
}

/** "#RRGGBB" hex rengine alfa (0-1) ekler; sonuc "#RRGGBBAA" */
export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
}
