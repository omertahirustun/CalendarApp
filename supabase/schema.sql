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
  color text default '#7C3AED',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists tasks (
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

create table if not exists tracked_items (
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
alter publication supabase_realtime add table events;
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table tracked_items;

-- Realtime RLS icin SELECT politikasi gerekir (yukaridaki FOR ALL kapsar).
