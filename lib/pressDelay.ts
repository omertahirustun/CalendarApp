/**
 * Kart dokunma hissi: dalga (ripple) efektinin tamamlanmasina yakin bir sure
 * bekledikten sonra duzenleme penceresi acilir — "aninda firlama" yerine
 * kasitli, dogal bir tiklama hissi verir.
 */
export const PRESS_FEEDBACK_MS = 280;

/** fn'i PRESS_FEEDBACK_MS sonra calistiran handler dondurur; fn yoksa undefined */
export function delayedPress(
  fn: (() => void) | undefined,
  ms: number = PRESS_FEEDBACK_MS
): (() => void) | undefined {
  if (!fn) return undefined;
  return () => {
    setTimeout(fn, ms);
  };
}

/** Kart ripple rengi — marka mavisinin cok hafif tonu */
export const CARD_RIPPLE = { color: "rgba(45,38,240,0.10)", foreground: true } as const;
