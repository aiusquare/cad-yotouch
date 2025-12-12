alter table if exists public.profiles
  add column if not exists badge_level integer not null default 0,
  add column if not exists badge_points integer not null default 0,
  add column if not exists badge_last_updated_at timestamptz default now();

create table if not exists public.badge_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event text not null,
  points integer not null default 0,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists badge_events_user_id_idx on public.badge_events(user_id);
