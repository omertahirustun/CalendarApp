/**
 * Uygulama genelinde (ana takvim ekrani + ana ekran widget'i) paylasilan renk
 * sabitleri. Iki ayri dosyada (CalendarGrid.tsx / CalendarWidgetView.tsx)
 * elle senkron tutulan hex kodlarinin zamanla birbirinden sapmasini onlemek
 * icin tek kaynak burasi. Widget kodu da bu dosyayi dogrudan import edebilir
 * (react-native-android-widget sadece duz JS/TS degerlere ihtiyac duyar).
 */
export const COLORS = {
  primary: "#2D26F0",
  border: "#ECEEF2",
  text: "#1F2937",
  muted: "#6B7280",
  /** Hafta sonu hucre arka plani (ay izgarasi) */
  weekendBg: "#E2E3E7",
  /** Onceki/sonraki ayin tasan gunleri icin hucre arka plani */
  outOfMonthBg: "#F2F2F4",
  /** Bugunun hucresini hafifce vurgulayan gri; ana ekranda "secili gun" ile ayni ton */
  todayBg: "#E6E8EF",
  /** Tarih araligi seciminde orta gunler */
  rangeMiddleBg: "#EDEEFF",
  /** Tarih araligi seciminde baslangic/bitis gunleri */
  rangeEdgeBg: "#E0E7FF",
} as const;
