-- Run this once in the Supabase SQL Editor (after schema.sql has already run).
-- Replaces the combined "jobs" table with separate Customers and Sites,
-- matching how customers/sites work in the real ForTheRecord app.

drop table if exists public.jobs cascade;

-- ── customers (admin-only, crew have no access) ─────────────────────────
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_person text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.customers enable row level security;

create policy "Admins can manage customers" on public.customers
  for all using (public.is_admin()) with check (public.is_admin());

-- ── sites (belong to a customer; crew can see active sites only) ────────
create table public.sites (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id),
  name text not null,
  address text,
  contact_person text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.sites enable row level security;

create policy "Crew can view active sites" on public.sites
  for select using (is_active = true);

create policy "Admins can manage all sites" on public.sites
  for all using (public.is_admin()) with check (public.is_admin());

-- ── timesheet_entries: job_id -> site_id ─────────────────────────────────
-- (the old foreign key to jobs was already dropped by the cascade above)
alter table public.timesheet_entries rename column job_id to site_id;
alter table public.timesheet_entries
  add constraint timesheet_entries_site_id_fkey
  foreign key (site_id) references public.sites(id);

-- ── profiles: add email, so the admin Staff list can show it without ────
-- needing a separate admin-API call per page load.
alter table public.profiles add column email text;
update public.profiles p set email = u.email from auth.users u where u.id = p.id;
alter table public.profiles alter column email set not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    'crew',
    new.email
  );
  return new;
end;
$$;
