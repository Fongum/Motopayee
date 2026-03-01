-- ============================================================
-- Migration 001 — Core Tables: profiles, dealers
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ============================================================
-- PROFILES
-- ============================================================

create table if not exists public.profiles (
  id            uuid primary key default gen_random_uuid(),
  auth_id       uuid unique,
  email         text not null unique,
  full_name     text,
  phone         text,
  city          text,
  zone          text check (zone in ('A', 'B', 'C')),
  role          text not null check (role in (
                  'buyer',
                  'seller_individual',
                  'seller_dealer',
                  'field_agent',
                  'inspector',
                  'verifier',
                  'admin'
                )),
  status        text not null default 'active' check (status in ('active', 'inactive', 'suspended')),
  last_login_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists profiles_auth_id_idx on public.profiles (auth_id) where auth_id is not null;
create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists profiles_role_idx on public.profiles (role);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============================================================
-- DEALERS
-- ============================================================

create table if not exists public.dealers (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles (id) on delete cascade,
  dealer_name   text not null,
  dealer_code   text unique,
  address       text,
  city          text,
  zone          text check (zone in ('A', 'B', 'C')),
  contact_email text,
  contact_phone text,
  verified      boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists dealers_profile_id_idx on public.dealers (profile_id);

-- ============================================================
-- RLS — PROFILES
-- ============================================================

alter table public.profiles enable row level security;

-- Service role: full access
create policy "service_role_all_profiles"
  on public.profiles for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Users: read own profile
create policy "profiles_select_own"
  on public.profiles for select
  using (auth_id = auth.uid());

-- Users: update own profile
create policy "profiles_update_own"
  on public.profiles for update
  using (auth_id = auth.uid())
  with check (auth_id = auth.uid());

-- Admins: all access (service role handles this; keeping for future JWT claims)
create policy "admin_all_profiles"
  on public.profiles for all
  using (
    exists (
      select 1 from public.profiles p
      where p.auth_id = auth.uid()
        and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.auth_id = auth.uid()
        and p.role = 'admin'
    )
  );

-- ============================================================
-- RLS — DEALERS
-- ============================================================

alter table public.dealers enable row level security;

create policy "service_role_all_dealers"
  on public.dealers for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "dealers_select_own"
  on public.dealers for select
  using (
    profile_id in (
      select id from public.profiles where auth_id = auth.uid()
    )
  );

-- ============================================================
-- COMMENTS
-- ============================================================
comment on table public.profiles is 'All MotoPayee user profiles — buyers, sellers, staff';
comment on table public.dealers is 'Dealer business entities linked to a seller_dealer profile';
comment on column public.profiles.zone is 'Zone A = major cities, B = secondary cities, C = rural';
comment on column public.profiles.role is 'User role determines access level and portal features';
