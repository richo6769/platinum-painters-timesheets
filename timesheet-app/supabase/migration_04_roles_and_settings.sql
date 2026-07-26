-- Run this once in the Supabase SQL Editor (after migration_03 has already run).
-- Renames the "crew" role to "painter", adds a "supervisor" role with
-- narrower permissions, and adds an app_settings table for the weekly
-- email report toggle.

-- ── profiles: crew -> painter, add supervisor ───────────────────────────
alter table public.profiles drop constraint if exists profiles_role_check;
update public.profiles set role = 'painter' where role = 'crew';
alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'supervisor', 'painter'));

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
    'painter',
    new.email
  );
  return new;
end;
$$;

-- Bypasses RLS (runs as the table owner), same pattern as is_admin().
create or replace function public.is_admin_or_supervisor()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'supervisor')
  );
$$;

-- Supervisors can see the staff list, but only admins can edit it.
drop policy if exists "Admins can view all profiles" on public.profiles;

create policy "Admins and supervisors can view all profiles" on public.profiles
  for select using (public.is_admin_or_supervisor());

-- ── customers: split "manage" into select/insert (admin+supervisor) ─────
-- and update (admin only) -- supervisors can add but not edit/archive.
drop policy if exists "Admins can manage customers" on public.customers;

create policy "Admins and supervisors can view customers" on public.customers
  for select using (public.is_admin_or_supervisor());

create policy "Admins and supervisors can add customers" on public.customers
  for insert with check (public.is_admin_or_supervisor());

create policy "Admins can update customers" on public.customers
  for update using (public.is_admin()) with check (public.is_admin());

-- ── sites: same split ─────────────────────────────────────────────────
drop policy if exists "Admins can manage all sites" on public.sites;

create policy "Admins and supervisors can view all sites" on public.sites
  for select using (public.is_admin_or_supervisor());

create policy "Admins and supervisors can add sites" on public.sites
  for insert with check (public.is_admin_or_supervisor());

create policy "Admins can update sites" on public.sites
  for update using (public.is_admin()) with check (public.is_admin());

-- ── timesheet_entries: supervisors need broad read for Activity/Dashboard ─
drop policy if exists "Admins can manage all entries" on public.timesheet_entries;

create policy "Admins and supervisors can view all entries" on public.timesheet_entries
  for select using (public.is_admin_or_supervisor());

create policy "Admins can manage all entries" on public.timesheet_entries
  for all using (public.is_admin()) with check (public.is_admin());

-- ── app_settings: single-row config table, admin-only ───────────────────
create table public.app_settings (
  id boolean primary key default true,
  weekly_report_enabled boolean not null default false,
  constraint app_settings_singleton check (id)
);

insert into public.app_settings (id, weekly_report_enabled) values (true, false);

alter table public.app_settings enable row level security;

create policy "Admins can view settings" on public.app_settings
  for select using (public.is_admin());

create policy "Admins can update settings" on public.app_settings
  for update using (public.is_admin()) with check (public.is_admin());
