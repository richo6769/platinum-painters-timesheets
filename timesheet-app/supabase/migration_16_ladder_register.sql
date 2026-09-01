-- Run this once in the Supabase SQL Editor (after migration_15 has already run).
-- Ladder Register: a compliance record of every ladder on hand (AS/NZS 1892),
-- plus its inspection history (rungs, stiles, feet, spreader arms, safety
-- labels). Admins and supervisors manage this, same access level as Sites
-- and Leave - deleting a ladder record is admin-only.

create table public.ladders (
  id uuid primary key default gen_random_uuid(),
  asset_number text not null unique,
  ladder_type text not null check (ladder_type in ('extension', 'single', 'stepladder')),
  material text not null check (material in ('aluminium', 'fibreglass', 'timber')),
  length_m numeric(4, 2),
  rating_kg integer not null default 120,
  standard text not null default 'AS/NZS 1892',
  location text,
  purchase_date date,
  inspection_frequency text not null default 'monthly'
    check (inspection_frequency in ('pre-use', 'monthly', 'quarterly', '6-monthly', 'annually')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.ladders enable row level security;

create policy "Admins and supervisors can view ladders" on public.ladders
  for select using (public.is_admin_or_supervisor());

create policy "Admins and supervisors can add ladders" on public.ladders
  for insert with check (public.is_admin_or_supervisor());

create policy "Admins and supervisors can update ladders" on public.ladders
  for update using (public.is_admin_or_supervisor()) with check (public.is_admin_or_supervisor());

create policy "Admins can delete ladders" on public.ladders
  for delete using (public.is_admin());

create table public.ladder_inspections (
  id uuid primary key default gen_random_uuid(),
  ladder_id uuid not null references public.ladders(id) on delete cascade,
  inspected_at date not null default current_date,
  inspector_id uuid references public.profiles(id) on delete set null,
  rungs_ok boolean not null,
  stiles_ok boolean not null,
  feet_ok boolean not null,
  spreader_arms_ok boolean not null,
  safety_labels_ok boolean not null,
  notes text,
  created_at timestamptz not null default now()
);

create index ladder_inspections_ladder_date_idx
  on public.ladder_inspections (ladder_id, inspected_at desc);

alter table public.ladder_inspections enable row level security;

create policy "Admins and supervisors can view ladder inspections" on public.ladder_inspections
  for select using (public.is_admin_or_supervisor());

create policy "Admins and supervisors can add ladder inspections" on public.ladder_inspections
  for insert with check (public.is_admin_or_supervisor());

create policy "Admins can delete ladder inspections" on public.ladder_inspections
  for delete using (public.is_admin());
