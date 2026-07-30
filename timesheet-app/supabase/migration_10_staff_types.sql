-- Run this once in the Supabase SQL Editor (after migration_09 has already run).
-- A simple managed list of staff types (e.g. Painter, Apprentice,
-- Contractor). Admin-only, unlike Customers/Sites - matches the app-layer
-- guard (page and actions both require admin, no supervisor access).

create table public.staff_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.staff_types enable row level security;

create policy "Admins can view staff types" on public.staff_types
  for select using (public.is_admin());

create policy "Admins can add staff types" on public.staff_types
  for insert with check (public.is_admin());

create policy "Admins can update staff types" on public.staff_types
  for update using (public.is_admin()) with check (public.is_admin());

create policy "Admins can delete staff types" on public.staff_types
  for delete using (public.is_admin());
