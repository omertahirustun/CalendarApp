import { COLORS } from "../../lib/theme";

export const CELL_H = 108;
export const MAX_VISIBLE_CHIPS = 3;
export const MAX_VISIBLE_BARS = 3;
export const PRIMARY_COLOR = COLORS.primary;
export const BORDER_COLOR = COLORS.border;
export const GRID_RADIUS = 12;
// Hafta sonu gun numarasi rengi (widget/CalendarWidgetView.tsx'teki WEEKEND_TEXT ile ayni)
export const WEEKEND_TEXT_COLOR = "#DC2626";

// Gun numarasi bloğunun gercek yuksekligi (pt-1.5=6 + h-7=28): cubuklarin ve
// normal etkinlik chip'lerinin ayni hizadan baslamasi icin TEK kaynak burasi.
export const DAY_NUM_H = 32; // Başlık yüksekliğini sabitledik (kaymayı önler)
export const BAR_SLOT_H = 21; // 19px çubuk + 3px margin-bottom
export const BAR_VISUAL_H = 18; // EventChip'in tam yüksekliği
export const CHIP_RADIUS = 5; // EventChip'teki rounded-md karşılığı
