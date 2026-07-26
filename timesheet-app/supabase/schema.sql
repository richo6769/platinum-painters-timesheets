-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query)
-- to set up the tables, security policies, and auto-profile trigger.

-- ── profiles ──────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'crew' check (role in ('admin', 'crew')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Bypasses RLS (runs as the table owner) so policies can check role
-- without recursively re-invoking RLS on profiles.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Admins can view all profiles" on public.profiles
  for select using (public.is_admin());

create policy "Admins can update profiles" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- Auto-create a profile row whenever a new auth user is created.
-- New users default to 'crew' -- promote the first admin manually (see bottom).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    'crew'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── jobs (customer + site) ───────────────────────────────────────────────
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  site_address text not null,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.jobs enable row level security;

create policy "Authenticated users can view jobs" on public.jobs
  for select using (auth.role() = 'authenticated');

create policy "Admins can manage jobs" on public.jobs
  for all using (public.is_admin()) with check (public.is_admin());

-- ── timesheet_entries ────────────────────────────────────────────────────
create table public.timesheet_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid not null references public.jobs(id),
  clock_in_at timestamptz not null default now(),
  clock_in_lat double precision,
  clock_in_lng double precision,
  clock_out_at timestamptz,
  clock_out_lat double precision,
  clock_out_lng double precision,
  notes text,
  created_at timestamptz not null default now()
);

-- A user can only have one open (not clocked out) entry at a time.
create unique index one_open_entry_per_user
  on public.timesheet_entries (user_id)
  where (clock_out_at is null);

create index timesheet_entries_report_idx
  on public.timesheet_entries (job_id, clock_in_at);

alter table public.timesheet_entries enable row level security;

create policy "Users can view own entries" on public.timesheet_entries
  for select using (auth.uid() = user_id);

create policy "Users can insert own entries" on public.timesheet_entries
  for insert with check (auth.uid() = user_id);

create policy "Users can update own entries" on public.timesheet_entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Admins can manage all entries" on public.timesheet_entries
  for all using (public.is_admin()) with check (public.is_admin());

-- ── after running this once ─────────────────────────────────────────────
-- 1. Sign up your own account through the app (it will default to 'crew').
-- 2. Promote yourself to admin by running, with your real email:
--
--    update public.profiles set role = 'admin'
--    where id = (select id from auth.users where email = 'you@example.com');
