import { withAlpha } from "./color";
import type { EventRow } from "./types";

/** Kisisel etkinliklerin sabit (opaksiz) rengi: acik mavi / camgobegi. */
export const PERSONAL_EVENT_COLOR = "#22D3EE";

/** EventChip/MultiDayEventBar'daki mevcut "dimmed" alfasiyla (0.35) tutarli sabit ton. */
const PERSONAL_ALPHA = 0.35;

export const PERSONAL_EVENT_FILL = withAlpha(PERSONAL_EVENT_COLOR, PERSONAL_ALPHA);
// Cerceve doldurmadan daha opak olursa saydamlik arttikca disari tasan bir halka gibi
// gorunuyordu; ayni alfa kullanilarak dolguyla kaynasik/gorunmez hale getirildi.
export const PERSONAL_EVENT_BORDER = PERSONAL_EVENT_FILL;

export function isPersonalEvent(event: Pick<EventRow, "visibility">): boolean {
  return event.visibility === "personal";
}

/** Solid-fill render siteleri (EventCard bar, widget) icin: opaklik zaten gomulu. */
export function getEventFillColor(event: Pick<EventRow, "color" | "visibility">): string {
  return isPersonalEvent(event) ? PERSONAL_EVENT_FILL : event.color;
}

/** Kontrast metin / chip taban rengi hesabinda kullanilacak "opaksiz" temel renk. */
export function getEventBaseColor(event: Pick<EventRow, "color" | "visibility">): string {
  return isPersonalEvent(event) ? PERSONAL_EVENT_COLOR : event.color;
}
