# Takvim Planlama Uygulaması — OpenCode Geliştirme Prompt'u

Bu dokümanı OpenCode'a olduğu gibi ver. Uygulamayı baştan sona, aşağıdaki spesifikasyona göre kur.

---

## 1. Proje Özeti

E-posta ile kayıt olunan, çoklu cihazlar arasında **gerçek zamanlı senkronize** çalışan bir takvim/planlama mobil uygulaması geliştir. Uygulama dört ana sekmeden oluşur: **Takvim**, **Yapılacaklar**, **Ajanda (Yaklaşan Etkinlikler)**, **Projeler (Takip Listesi)**.

## 2. Tech Stack

- **Framework:** Expo (React Native), TypeScript
- **Styling:** NativeWind (Tailwind CSS sınıflarıyla RN styling)
- **Auth:** Clerk (e-posta ile kayıt, e-posta doğrulama, şifre sıfırlama, session yönetimi)
- **Backend/DB/Realtime:** Supabase (PostgreSQL + Realtime subscriptions). Supabase'in kendi auth'u **kullanılmayacak** — sadece Postgres + Realtime katmanı kullanılacak, kimlik doğrulama tamamen Clerk üzerinden yürüyecek.
- **Navigasyon:** Expo Router (tab-based, 4 sekme)
- **Push Bildirim:** expo-notifications

## 3. Clerk + Supabase Entegrasyonu (kritik adım)

1. Clerk Dashboard'da bir JWT Template oluştur, adı `supabase` olsun. Template içinde Supabase'in beklediği claim'leri (`sub`, `role: authenticated`) ver.
2. Supabase projesinde Authentication ayarlarından üçüncü parti JWT doğrulamasını Clerk'in JWKS endpoint'ine göre yapılandır.
3. Tüm tablolarda `user_id` kolonu **text** tipinde ve Clerk'in `sub` (user id) değerini tutacak.
4. RLS (Row Level Security) tüm tablolarda aktif olacak, politika: `auth.jwt() ->> 'sub' = user_id`.
5. RN tarafında: her Supabase client isteğinde `useAuth().getToken({ template: 'supabase' })` ile alınan güncel JWT kullanılacak. Supabase client'ı bu token ile custom fetch/header olarak initialize et.

## 4. Tasarım Sistemi (Tema)

Referans ekran görüntülerindeki tasarıma sadık kal:

- **Ana renk paleti:** Açık/beyaz zemin, ana vurgu rengi mor-indigo (`#7C3AED` / `#6366F1` tonları)
- **İkincil renkler (etiket/kategori):** Kırmızı (#EF4444 - yüksek öncelik), turuncu (#F59E0B - orta), yeşil (#10B981 - tamamlandı/düşük), mavi (#3B82F6)
- **Kartlar:** Beyaz zemin, hafif gölge (`shadow-sm`), yuvarlatılmış köşeler (`rounded-2xl`)
- **Tipografi:** Başlıklar kalın (`font-bold`), büyük boy; alt metinler gri (`text-gray-500`), küçük boy
- **Takvim grid'i:** Günlerin altında küçük renkli noktalar (o günde etkinlik olduğunu gösteren indicator), seçili gün mor daire içinde vurgulanır
- **Alt tab bar:** 4 ikon + label, aktif sekme mor renkte dolu ikon, pasifler gri outline
- **Butonlar (FAB / primary):** Mor daire/pill şeklinde, beyaz ikon/metin
- **Üst header:** "İyi günler, [İsim]" gibi kişiselleştirilmiş karşılama + bildirim zili ikonu sağda
- **Ajanda ekranı üst kısmı:** Koyu/gradient kart (ay özeti — "Bu Ay: X etkinlik, Y görev") — ekran görüntüsündeki koyu "Ekim 2024" kartına benzer

Tüm renkleri `tailwind.config.js` içinde NativeWind theme extend olarak tanımla (`primary`, `danger`, `warning`, `success` gibi semantic isimlerle), hardcoded hex kullanma.

## 5. Veri Modeli (Supabase / PostgreSQL)

```sql
create extension if not exists "pgcrypto";

create table events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  location text,
  color text default '#7C3AED',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  title text not null,
  status text default 'pending', -- 'pending' | 'completed'
  priority text default 'medium', -- 'high' | 'medium' | 'low'
  due_date timestamptz,
  color text default '#7C3AED',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table tracked_items (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  title text not null,
  note text,
  link text,
  status text default 'pending', -- 'pending' | 'completed'
  color text default '#7C3AED',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  push_token text not null,
  created_at timestamptz default now()
);

-- RLS
alter table events enable row level security;
alter table tasks enable row level security;
alter table tracked_items enable row level security;
alter table device_tokens enable row level security;

create policy "own events" on events for all using (auth.jwt() ->> 'sub' = user_id);
create policy "own tasks" on tasks for all using (auth.jwt() ->> 'sub' = user_id);
create policy "own tracked_items" on tracked_items for all using (auth.jwt() ->> 'sub' = user_id);
create policy "own device_tokens" on device_tokens for all using (auth.jwt() ->> 'sub' = user_id);

-- Realtime
alter publication supabase_realtime add table events;
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table tracked_items;
```

## 6. Özellik Detayları

### 6.1 Renklendirme (tüm modüllerde ortak)
- Yeniden kullanılabilir bir `ColorPicker` component'i oluştur (6-8 önceden tanımlı renk noktası, seçili olan check ikonuyla belirtilir)
- Event/Task/TrackedItem oluşturma-düzenleme formlarında kullanılır
- Seçilen renk: takvimde gün altındaki noktada, kart sol kenarlığında (`border-l-4`) ve etiket arka planında gösterilir

### 6.2 Tamamlama Davranışı (checkbox + üstü çizili)
- Task ve TrackedItem kartlarının solunda dairesel checkbox
- `status: 'completed'` olduğunda:
  - Başlık: `line-through text-gray-400` (NativeWind)
  - Checkbox: dolu, mor/yeşil arka plan + check ikonu
  - Kart geneli hafif opaklaştırılır (`opacity-60`)
- Tıklama optimistic update yapar (anlık UI güncellemesi, arka planda Supabase update)

### 6.3 Projeler / Takip Listesi (4. sekme)
- Serbest başlık girme alanı (kısa not + opsiyonel link)
- Liste görünümü: Yapılacaklar ekranındaki kart tasarımına benzer ama daha sade (öncelik/tarih zorunlu değil)
- Aynı checkbox + üstü çizili tamamlama davranışı burada da geçerli
- Arama kutusu (başlık/not içinde arama)

### 6.4 Gerçek Zamanlı Senkronizasyon
- Her ekranda ilgili tabloya Supabase `postgres_changes` realtime subscription açılır (`INSERT`, `UPDATE`, `DELETE` event'leri dinlenir)
- Gelen değişiklik local state'e (React Query cache veya Zustand store) anında yansıtılır
- Component unmount olduğunda channel `unsubscribe` edilir (memory leak önleme)

## 7. Ekran / Navigasyon Yapısı

```
app/
  (auth)/
    sign-in.tsx
    sign-up.tsx
    verify-email.tsx
  (tabs)/
    index.tsx          -> Takvim
    tasks.tsx           -> Yapılacaklar
    agenda.tsx           -> Ajanda / Yaklaşan Etkinlikler
    projects.tsx          -> Projeler / Takip Listesi
    settings.tsx (opsiyonel, ayarlar ikonu var ekran görüntüsünde)
  components/
    ColorPicker.tsx
    EventCard.tsx
    TaskCard.tsx
    TrackedItemCard.tsx
    CalendarGrid.tsx
    Header.tsx
  lib/
    supabase.ts   -> Clerk token ile client init
    clerk.ts
  hooks/
    useEventsRealtime.ts
    useTasksRealtime.ts
    useTrackedItemsRealtime.ts
```

## 8. Geliştirme Fazları (sırayla uygula)

**Faz 1 — Kurulum**
- Expo + TypeScript proje iskeleti, Expo Router
- NativeWind kurulumu (tailwind.config.js, babel plugin, global.css)
- Clerk kurulumu: ClerkProvider, publishable key .env, sign-up/sign-in/verify-email ekranları
- Supabase proje kurulumu, JWT template + RLS + realtime publication yukarıdaki SQL ile

**Faz 2 — Takvim Modülü**
- Aylık takvim grid UI (tema bölümündeki stile göre)
- Gün altı renkli nokta indicator'ları
- Seçili gün detay paneli (o güne ait event kartları)
- Event oluştur/düzenle/sil formu (ColorPicker dahil)
- `useEventsRealtime` hook entegrasyonu

**Faz 3 — Yapılacaklar Modülü**
- Görev listesi UI (arama, filtre: Tümü/Bekleyen/Tamamlanan)
- Task CRUD formu (öncelik, son tarih, renk)
- Checkbox + üstü çizili tamamlama davranışı
- `useTasksRealtime` hook entegrasyonu

**Faz 4 — Ajanda / Yaklaşan Etkinlikler**
- Zaman çizelgesi görünümü (Bugün/Yarın/Bu hafta gruplaması)
- Üst kısımda koyu özet kartı (aylık etkinlik/görev sayacı)
- Event kartlarında katılımcı avatarı alanı (opsiyonel, v2'de gerçek veri; MVP'de placeholder)

**Faz 5 — Projeler / Takip Listesi**
- `tracked_items` CRUD
- Aynı checkbox/üstü çizili davranış
- Arama kutusu
- Tab bar'a 4. sekme olarak ekle

**Faz 6 — Bildirimler & Cila**
- expo-notifications kurulumu, `device_tokens` tablosuna kayıt
- Yaklaşan event/task için local/push hatırlatma
- Genel UI polish: boş durum (empty state) ekranları, loading skeleton'lar, hata mesajları
- Çoklu cihaz realtime testi (iki simülatör/cihazda aynı hesap, canlı senkron doğrulama)

## 9. Kabul Kriterleri (MVP tamamlanma tanımı)

- [ ] Kullanıcı e-posta ile kayıt olup doğrulama yapabiliyor
- [ ] Takvimde event oluşturma, cihaz A'da yapılan değişiklik cihaz B'de anında görünüyor
- [ ] Görevler oluşturulabiliyor, tamamlanınca üstü çiziliyor
- [ ] Projeler sekmesinde takip edilen iş başlıkları not edilebiliyor, tamamlananlar üstü çizili gösteriliyor
- [ ] Renk seçimi event/task/tracked item genelinde tutarlı çalışıyor
- [ ] Tema, paylaşılan referans görsellerdeki mor-beyaz tasarıma sadık

---

Bu prompt'u OpenCode'a ver ve Faz 1'den başlayarak sırayla ilerlemesini iste.
