-- Takvim Planlama Uygulamasi — Supabase sema
-- Supabase SQL Editor'de calistirin.
-- ONCELIK: Authentication -> Third-Party Auth -> Clerk JWKS baglantisi yapilmis olmali.
-- Clerk Dashboard'da "supabase" adinda JWT Template olusturulmali (claims: sub, role=authenticated).

create extension if not exists "pgcrypto";

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  location text,
  color text default '#2D26F0',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- NOT: 'tasks' tablosu UI'dan kaldırıldı (v2), veri korunuyor, tablo drop edilmedi.
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  title text not null,
  status text default 'pending', -- 'pending' | 'completed'
  priority text default 'medium', -- 'high' | 'medium' | 'low'
  due_date timestamptz,
  color text default '#2D26F0',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists tracked_items (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  title text not null,
  note text,
  link text,
  status text default 'pending', -- 'pending' | 'completed'
  color text default '#2D26F0',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists device_tokens (
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

drop policy if exists "own events" on events;
create policy "own events" on events for all using (auth.jwt() ->> 'sub' = user_id);
drop policy if exists "own tasks" on tasks;
create policy "own tasks" on tasks for all using (auth.jwt() ->> 'sub' = user_id);
drop policy if exists "own tracked_items" on tracked_items;
create policy "own tracked_items" on tracked_items for all using (auth.jwt() ->> 'sub' = user_id);
drop policy if exists "own device_tokens" on device_tokens;
create policy "own device_tokens" on device_tokens for all using (auth.jwt() ->> 'sub' = user_id);

-- Realtime
-- Tekrar calistirilabilir olsun diye zaten ekliyse hata yutulur
do $$ begin
  alter publication supabase_realtime add table events;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table tasks;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table tracked_items;
exception when duplicate_object then null; end $$;

-- Realtime RLS icin SELECT politikasi gerekir (yukaridaki FOR ALL kapsar).

-- ============================================================
-- v3 Migration: sunucu tarafi push hatirlatmalari
-- ============================================================

-- Push hatirlatma takibi: ayni etkinlige iki kez bildirim gitmesin
alter table events add column if not exists reminder_sent_at timestamptz;

-- ============================================================
-- v4 Migration: etkinlik kategorileri
-- ============================================================

-- 'meeting' | 'project' | 'payment' | 'health' | 'other'
alter table events add column if not exists category text default 'other';

-- ============================================================
-- v5 Migration: etkinligi ekleyen kullanicinin adi
-- ============================================================

alter table events add column if not exists created_by_name text;

-- ============================================================
-- v6 Migration: takip ogeleri icin suruklenebilir siralama
-- ============================================================

alter table tracked_items add column if not exists sort_order integer;

-- Mevcut kayitlar icin created_at sirasina gore ilk deger ata (bir kerelik)
update tracked_items t set sort_order = sub.rn
from (
  select id, row_number() over (partition by user_id order by created_at) as rn
  from tracked_items
) sub
where t.id = sub.id and t.sort_order is null;

-- Tek istekte toplu yeniden siralama (client'tan supabase.rpc ile cagirilir)
create or replace function reorder_tracked_items(p_user_id text, p_ids uuid[])
returns void
language sql
security invoker
set search_path = public
as $$
  update tracked_items t
  set sort_order = u.ord - 1
  from unnest(p_ids) with ordinality as u(id, ord)
  where t.id = u.id;
$$;

-- ============================================================
-- v7 Migration: ortak (paylasilan) takvim
-- Tum giris yapan kullanicilar tum etkinlikleri ve takip ogelerini
-- gorur, olusturur, duzenler ve silebilir. user_id artik "ekleyen
-- kisi" anlamina gelir; erisim kisitilamaz.
-- ============================================================

drop policy if exists "own events" on events;
create policy "shared events" on events
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "own tracked_items" on tracked_items;
create policy "shared tracked_items" on tracked_items
  for all
  to authenticated
  using (true)
  with check (true);

-- device_tokens kisiye ozel kalir: her kullanici yalnizca kendi
-- token'ini yazar; push gonderimi service role ile yapilir.

-- ============================================================
-- v8 Migration: bütünlük + performans + cron güvenliği
-- ============================================================

-- Aynı cihaz token'ının aynı kullanıcı altında mükerrer kaydını önle
-- (önce varsa duplikeleri temizle, sonra unique index koy)
delete from device_tokens t
using device_tokens keeper
where t.user_id = keeper.user_id
  and t.push_token = keeper.push_token
  and t.id > keeper.id;

create unique index if not exists device_tokens_user_push_unique
  on device_tokens (user_id, push_token);

-- Dakikalık hatırlatma sorgusu ve kullanıcı bazlı token aramaları için indeksler
create index if not exists idx_events_start_time on events (start_time);
create index if not exists idx_device_tokens_user on device_tokens (user_id);

-- send-event-reminders Edge Function'ini her dakika tetikleyen cron job.
-- ONCELIK: pg_cron ve pg_net extension'lari aktif olmali:
--   create extension if not exists pg_cron with schema extensions;
--   create extension if not exists pg_net with schema extensions;
--
-- DIKKAT: Asagidaki blogu calistirmadan Once <PROJECT_URL> ve <ANON_KEY>
-- yer tutucularini gercek degerlerle degistirin; aksi halde her dakika gecersiz
-- bir adrese POST atan is kurulur. (Mevcut kurulumlarda is zaten kuruludur;
-- tekrar calistirmak gereksizdir — pg_cron ismiyle eskiyi gunceller.)
--
-- select cron.schedule(
--   'send-event-reminders-every-minute',
--   '* * * * *',
--   $$
--   select net.http_post(
--     url := '<PROJECT_URL>/functions/v1/send-event-reminders',
--     headers := jsonb_build_object('Authorization', 'Bearer <ANON_KEY>', 'Content-Type', 'application/json')
--   );
--   $$
-- );
