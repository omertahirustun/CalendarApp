export const MONTHS_TR = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

export const WEEKDAYS_TR = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

export function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

export function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

export function addMonths(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(1);
  c.setMonth(c.getMonth() + n);
  return c;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}

/** Pazartesi baslangicli hafta basi */
export function startOfWeek(d: Date): Date {
  const c = startOfDay(d);
  const day = (c.getDay() + 6) % 7;
  return addDays(c, -day);
}

/** 6x7 ay matrisi (Pazartesi baslangicli) */
export function getMonthMatrix(monthDate: Date): Date[][] {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const gridStart = startOfWeek(first);
  const weeks: Date[][] = [];
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(addDays(gridStart, w * 7 + d));
    }
    weeks.push(week);
    const lastCell = week[6];
    if (
      lastCell.getMonth() !== monthDate.getMonth() &&
      lastCell > new Date(monthDate.getFullYear(), monthDate.getMonth(), 27)
    ) {
      // bu haftadan sonra tum hucreler sonraki ay olur, durdur
      if (w >= 4) break;
    }
  }
  return weeks;
}

export function toISODateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODateString(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** HH:mm -> dakika */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function isValidTime(t: string): boolean {
  // Tek haneli saat de kabul edilir ("9:30" gecerli)
  return /^([01]?\d|2[0-3]):[0-5]\d$/.test(t.trim());
}

/** "9:30" -> "09:30"; gecerli HH:mm/H:mm girisini iki haneli saate cevirir */
export function normalizeTime(t: string): string {
  const [h, m] = t.trim().split(":");
  return `${String(Number(h)).padStart(2, "0")}:${m}`;
}

/** Secili gun + HH:mm -> ISO string (yerel saat) */
export function combineDateTime(date: Date, time: string): string {
  const [h, m] = time.split(":").map(Number);
  const dt = new Date(date);
  dt.setHours(h, m, 0, 0);
  return dt.toISOString();
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function formatDayMonth(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS_TR[d.getMonth()]}`;
}

export function formatFullDate(d: Date): string {
  return `${d.getDate()} ${MONTHS_TR[d.getMonth()]} ${d.getFullYear()}, ${WEEKDAYS_TR[(d.getDay() + 6) % 7]}`;
}

/** Ajanda baslik etiketi: gercek tarih + gun adi, "23 Ağustos, Pazar (Bugün)" */
export function formatAgendaDayLabel(d: Date): string {
  const diffDays = Math.round(
    (startOfDay(d).getTime() - startOfDay(new Date()).getTime()) / 86400000
  );
  const suffix =
    diffDays === 0 ? " (Bugün)" : diffDays === 1 ? " (Yarın)" : "";
  return `${d.getDate()} ${MONTHS_TR[d.getMonth()]}, ${WEEKDAYS_TR[(d.getDay() + 6) % 7]}${suffix}`;
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}
