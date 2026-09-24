import WidgetKit
import SwiftUI

// RN tarafi (lib/widgetData.ts + widget/refreshIOS.ts) ile ayni App Group ve
// anahtar. Degistirilirse ikisi birden guncellenmeli.
private let appGroupId = "group.com.sezeryanpatates.calendarapp.widget"
private let storageKey = "widgetData"

private let primaryColor = Color(red: 0x2D / 255, green: 0x26 / 255, blue: 0xF0 / 255)
// Sistem renkleri kullanilir ki acik/koyu mod arasinda otomatik gecsin (sabit
// hex renkler karanlik widget arka planinda goze batmiyordu, bkz. gecmis hata).
private let mutedColor = Color.secondary
private let textColor = Color.primary
private let weekendTextColor = Color.red
private let outOfMonthTextColor = Color.secondary.opacity(0.5)
private let todayBg = Color.primary.opacity(0.1)
private let gridBorderColor = Color.primary.opacity(0.08)

private let monthFormatter: DateFormatter = {
    let f = DateFormatter()
    f.locale = Locale(identifier: "tr_TR")
    f.dateFormat = "LLLL yyyy"
    return f
}()

private let isoDayFormatter: DateFormatter = {
    let f = DateFormatter()
    f.locale = Locale(identifier: "en_US_POSIX")
    f.dateFormat = "yyyy-MM-dd"
    return f
}()

private let weekdaysTR = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"]

// lib/widgetData.ts#WidgetEventSummary / WidgetData ile birebir ayni sekil
struct WidgetEventSummary: Codable {
    let id: String
    let title: String
    let color: String
    let date: String
    let endDate: String
    let time: String?
    let allDay: Bool
}

struct CalendarWidgetData: Codable {
    let updatedAt: String
    let events: [WidgetEventSummary]
}

private let emptyWidgetData = CalendarWidgetData(updatedAt: "", events: [])

struct CalendarEntry: TimelineEntry {
    let date: Date
    let data: CalendarWidgetData
}

/// Kendi basina network istegi ATMAZ; yalnizca uygulama en son acikken RN
/// tarafinin App Group'a yazdigi ozeti (bkz. widget/refreshIOS.ts) okur.
struct CalendarProvider: TimelineProvider {
    func placeholder(in context: Context) -> CalendarEntry {
        CalendarEntry(date: Date(), data: emptyWidgetData)
    }

    func getSnapshot(in context: Context, completion: @escaping (CalendarEntry) -> Void) {
        completion(CalendarEntry(date: Date(), data: loadWidgetData()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<CalendarEntry>) -> Void) {
        let entry = CalendarEntry(date: Date(), data: loadWidgetData())
        // Android tarafindaki updatePeriodMillis (30dk) ile tutarli; uygulama
        // acildiginda zaten aninda reloadWidget() ile tetikleniyor (bkz.
        // widget/refreshIOS.ts), bu sadece uygulama hic acilmasa da "bugun"
        // etiketinin taze kalmasini saglayan bir yedek.
        let nextRefresh = Date().addingTimeInterval(30 * 60)
        completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
    }

    private func loadWidgetData() -> CalendarWidgetData {
        guard
            let defaults = UserDefaults(suiteName: appGroupId),
            let raw = defaults.string(forKey: storageKey),
            let jsonData = raw.data(using: .utf8)
        else {
            return emptyWidgetData
        }
        return (try? JSONDecoder().decode(CalendarWidgetData.self, from: jsonData)) ?? emptyWidgetData
    }
}

private extension Color {
    /// "#RRGGBB" veya "#RRGGBBAA" hex string'inden renk uretir.
    init(hex: String) {
        var hexValue = hex.trimmingCharacters(in: .alphanumerics.inverted)
        if hexValue.count == 6 { hexValue.append("FF") }
        var rgba: UInt64 = 0
        Scanner(string: hexValue).scanHexInt64(&rgba)
        let r = Double((rgba & 0xFF00_0000) >> 24) / 255
        let g = Double((rgba & 0x00FF_0000) >> 16) / 255
        let b = Double((rgba & 0x0000_FF00) >> 8) / 255
        let a = Double(rgba & 0x0000_00FF) / 255
        self.init(.sRGB, red: r, green: g, blue: b, opacity: a)
    }
}

private struct RGBComponents {
    let r: Double
    let g: Double
    let b: Double
}

/// "#RRGGBB" hex string'inden 0-255 araligindaki bilesenleri okur (lib/color.ts ile ayni mantik).
private func parseHexRGB(_ hex: String) -> RGBComponents {
    var h = hex.trimmingCharacters(in: .alphanumerics.inverted)
    if h.count >= 6 { h = String(h.prefix(6)) }
    var v: UInt64 = 0
    Scanner(string: h).scanHexInt64(&v)
    return RGBComponents(
        r: Double((v & 0xFF0000) >> 16),
        g: Double((v & 0x00FF00) >> 8),
        b: Double(v & 0x0000FF)
    )
}

/// Rengi beyaza dogru soldurur (lib/color.ts#fadeTowardWhite ile ayni formul).
private func fadeTowardWhite(_ hex: String, _ amount: Double) -> Color {
    let c = parseHexRGB(hex)
    func mix(_ v: Double) -> Double { 255 - (255 - v) * amount }
    return Color(.sRGB, red: mix(c.r) / 255, green: mix(c.g) / 255, blue: mix(c.b) / 255, opacity: 1)
}

/// Hex rengin parlakligina gore beyaz veya koyu metin rengi dondurur (lib/color.ts#contrastTextColor, YIQ formulu).
private func contrastTextColor(_ hex: String) -> Color {
    let c = parseHexRGB(hex)
    let luminance = (c.r * 299 + c.g * 587 + c.b * 114) / 1000
    return luminance > 210 ? Color(hex: "#1F2937") : Color.white
}

private func eventDisplayColor(_ hex: String, fadeOutOfMonth: Bool) -> Color {
    fadeTowardWhite(hex, fadeOutOfMonth ? 0.35 : 0.82)
}

private struct EventRowView: View {
    let event: WidgetEventSummary

    var body: some View {
        Link(destination: URL(string: "calendarapp://?date=\(event.date)") ?? URL(string: "calendarapp://")!) {
            HStack(spacing: 6) {
                Circle()
                    .fill(Color(hex: event.color))
                    .frame(width: 7, height: 7)
                Text(event.title)
                    .font(.system(size: 12))
                    .foregroundColor(textColor)
                    .lineLimit(1)
                Spacer(minLength: 4)
                if let time = event.time {
                    Text(time)
                        .font(.system(size: 10))
                        .foregroundColor(mutedColor)
                }
            }
        }
    }
}

// MARK: - Ay izgarasi (buyuk widget) — Android'deki widget/CalendarWidgetView.tsx#MonthGrid ile ayni mantik

private let trCalendar: Calendar = Calendar(identifier: .gregorian)

private func addDays(_ d: Date, _ n: Int) -> Date {
    trCalendar.date(byAdding: .day, value: n, to: d) ?? d
}

/// Pazartesi baslangicli hafta basi (lib/date.ts#startOfWeek ile ayni mantik).
private func startOfWeek(_ d: Date) -> Date {
    let day = trCalendar.startOfDay(for: d)
    let weekday = trCalendar.component(.weekday, from: day) // 1=Paz ... 7=Cmt
    let mondayIndex = (weekday + 5) % 7 // 0=Pzt ... 6=Paz
    return addDays(day, -mondayIndex)
}

/// 6x7 (bazen 5x7) ay matrisi (lib/date.ts#getMonthMatrix ile ayni mantik).
private func monthMatrix(_ monthDate: Date) -> [[Date]] {
    let comps = trCalendar.dateComponents([.year, .month], from: monthDate)
    let first = trCalendar.date(from: comps) ?? monthDate
    let gridStart = startOfWeek(first)
    let monthComp = trCalendar.component(.month, from: monthDate)
    let day27 = trCalendar.date(bySetting: .day, value: 27, of: first) ?? first

    var weeks: [[Date]] = []
    for w in 0..<6 {
        var week: [Date] = []
        for d in 0..<7 {
            week.append(addDays(gridStart, w * 7 + d))
        }
        weeks.append(week)
        let lastCell = week[6]
        let lastCellMonth = trCalendar.component(.month, from: lastCell)
        if lastCellMonth != monthComp && lastCell > day27 && w >= 4 {
            break
        }
    }
    return weeks
}

private struct DaySpan {
    let event: WidgetEventSummary
    let isStart: Bool
    let isEnd: Bool
    let showTitle: Bool
}

/// Cok gunlu etkinliklerin her gununu, o gunun baslangic/bitis/orta gunu olup
/// olmadigi bilgisiyle esler (Android#buildMultiDaySpans ile ayni mantik).
private func buildMultiDaySpans(_ events: [WidgetEventSummary]) -> [String: DaySpan] {
    var map: [String: DaySpan] = [:]
    for ev in events where ev.allDay {
        guard
            let start = isoDayFormatter.date(from: ev.date),
            let end = isoDayFormatter.date(from: ev.endDate),
            end >= start
        else { continue }

        let totalDays = (trCalendar.dateComponents([.day], from: start, to: end).day ?? 0) + 1
        let middleDate = addDays(start, (totalDays - 1) / 2)
        let middleIso = isoDayFormatter.string(from: middleDate)

        var cursor = start
        while cursor <= end {
            let iso = isoDayFormatter.string(from: cursor)
            if map[iso] == nil {
                map[iso] = DaySpan(event: ev, isStart: iso == ev.date, isEnd: iso == ev.endDate, showTitle: iso == middleIso)
            }
            cursor = addDays(cursor, 1)
        }
    }
    return map
}

private let maxEventsPerCell = 3

private struct DayCellView: View {
    let day: Date
    let monthDate: Date
    let todayIso: String
    let span: DaySpan?
    let singleEvents: [WidgetEventSummary]

    private var iso: String { isoDayFormatter.string(from: day) }
    private var inMonth: Bool { trCalendar.isDate(day, equalTo: monthDate, toGranularity: .month) }
    private var isToday: Bool { iso == todayIso }
    private var isWeekend: Bool {
        let weekday = trCalendar.component(.weekday, from: day) // 1=Paz, 7=Cmt
        return weekday == 1 || weekday == 7
    }
    private var fade: Bool { !inMonth }
    private var dayNumberColor: Color {
        if !inMonth { return outOfMonthTextColor }
        if isWeekend { return weekendTextColor }
        return textColor
    }

    private var remainingSlots: Int { span != nil ? maxEventsPerCell - 1 : maxEventsPerCell }
    private var visibleSingleEvents: [WidgetEventSummary] { Array(singleEvents.prefix(remainingSlots)) }
    private var hiddenCount: Int { max(singleEvents.count - remainingSlots, 0) }

    var body: some View {
        Link(destination: URL(string: "calendarapp://?date=\(iso)") ?? URL(string: "calendarapp://")!) {
            VStack(spacing: 0) {
                Text("\(trCalendar.component(.day, from: day))")
                    .font(.system(size: 9, weight: isToday ? .black : .bold))
                    .foregroundColor(dayNumberColor)
                    .frame(width: 14, height: 14)
                    .background(isToday ? todayBg : Color.clear)
                    .clipShape(Circle())

                if let span {
                    // Android'deki gibi cubuk yalnizca gercek baslangic/bitis gununde
                    // yuvarlatilir, aradaki gunlerde koseler kare kalir ki bitisik
                    // hucreler arasinda bosluk gorunmeden tek parca bir cubuk gibi dursun.
                    UnevenRoundedRectangle(
                        topLeadingRadius: span.isStart ? 2 : 0,
                        bottomLeadingRadius: span.isStart ? 2 : 0,
                        bottomTrailingRadius: span.isEnd ? 2 : 0,
                        topTrailingRadius: span.isEnd ? 2 : 0
                    )
                    .fill(eventDisplayColor(span.event.color, fadeOutOfMonth: fade))
                    .frame(height: 9)
                    .padding(.leading, span.isStart ? 1 : 0)
                    .padding(.trailing, span.isEnd ? 1 : 0)
                    .overlay(
                        Group {
                            if span.showTitle {
                                Text(span.event.title)
                                    .font(.system(size: 7, weight: .semibold))
                                    .lineLimit(1)
                                    .minimumScaleFactor(0.7)
                                    .foregroundColor(contrastTextColor(span.event.color))
                            }
                        }
                    )
                }

                ForEach(visibleSingleEvents, id: \.id) { ev in
                    Text(ev.title)
                        .font(.system(size: 7, weight: .semibold))
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                        .frame(maxWidth: .infinity)
                        .frame(height: 9)
                        .foregroundColor(contrastTextColor(ev.color))
                        .background(eventDisplayColor(ev.color, fadeOutOfMonth: fade))
                        .cornerRadius(2)
                        .padding(.horizontal, 1)
                }

                if hiddenCount > 0 {
                    Text("+\(hiddenCount)")
                        .font(.system(size: 6, weight: .semibold))
                        .foregroundColor(mutedColor)
                }

                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }
}

private struct MonthGridView: View {
    let data: CalendarWidgetData

    private let monthDate = Date()
    private var todayIso: String { isoDayFormatter.string(from: Date()) }
    private var weeks: [[Date]] { monthMatrix(monthDate) }
    private var spanByDate: [String: DaySpan] { buildMultiDaySpans(data.events) }
    private var singleByDate: [String: [WidgetEventSummary]] {
        var map: [String: [WidgetEventSummary]] = [:]
        for ev in data.events where !ev.allDay {
            map[ev.date, default: []].append(ev)
        }
        return map
    }

    var body: some View {
        VStack(spacing: 2) {
            HStack(spacing: 0) {
                ForEach(weekdaysTR, id: \.self) { label in
                    Text(label)
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(mutedColor)
                        .frame(maxWidth: .infinity)
                }
            }

            VStack(spacing: 0) {
                ForEach(weeks.indices, id: \.self) { wi in
                    HStack(spacing: 0) {
                        ForEach(weeks[wi], id: \.self) { day in
                            let iso = isoDayFormatter.string(from: day)
                            DayCellView(
                                day: day,
                                monthDate: monthDate,
                                todayIso: todayIso,
                                span: spanByDate[iso],
                                singleEvents: singleByDate[iso] ?? []
                            )
                        }
                    }
                    .frame(maxHeight: .infinity)

                    if wi < weeks.count - 1 {
                        Rectangle()
                            .fill(gridBorderColor)
                            .frame(height: 0.5)
                    }
                }
            }
        }
    }
}

struct CalendarWidgetEntryView: View {
    var entry: CalendarProvider.Entry
    @Environment(\.widgetFamily) private var family

    private var todayISO: String { isoDayFormatter.string(from: Date()) }

    private var todaysEvents: [WidgetEventSummary] {
        entry.data.events.filter { $0.date == todayISO }
    }

    private var upcomingEvents: [WidgetEventSummary] {
        entry.data.events.filter { $0.date != todayISO }
    }

    private var rows: [WidgetEventSummary] {
        Array((todaysEvents.isEmpty ? upcomingEvents : todaysEvents).prefix(4))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            VStack(spacing: 1) {
                Text("Adezyon")
                    .font(.system(size: 15, weight: .heavy))
                    .foregroundColor(primaryColor)
                Text(monthFormatter.string(from: Date()).capitalized)
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(mutedColor)
            }
            .frame(maxWidth: .infinity)

            if family == .systemLarge {
                MonthGridView(data: entry.data)
            } else if entry.data.events.isEmpty {
                Text("Etkinlik yok")
                    .font(.system(size: 12))
                    .foregroundColor(mutedColor)
            } else {
                if todaysEvents.isEmpty {
                    Text("Bugün etkinlik yok · yaklaşan:")
                        .font(.system(size: 9))
                        .foregroundColor(mutedColor)
                }
                ForEach(rows, id: \.id) { event in
                    EventRowView(event: event)
                }
            }

            Spacer(minLength: 0)
        }
        .padding(12)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

struct CalendarWidget: Widget {
    let kind: String = "CalendarWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: CalendarProvider()) { entry in
            CalendarWidgetEntryView(entry: entry)
                .containerBackground(.background, for: .widget)
        }
        .configurationDisplayName("Takvim")
        .description("Bugünün ve yaklaşan etkinliklerin özeti")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

#Preview(as: .systemLarge) {
    CalendarWidget()
} timeline: {
    CalendarEntry(date: .now, data: emptyWidgetData)
    CalendarEntry(
        date: .now,
        data: CalendarWidgetData(
            updatedAt: "",
            events: [
                WidgetEventSummary(
                    id: "1",
                    title: "Örnek etkinlik",
                    color: "#2D26F0",
                    date: isoDayFormatter.string(from: Date()),
                    endDate: isoDayFormatter.string(from: Date()),
                    time: "09:00",
                    allDay: false
                )
            ]
        )
    )
}
