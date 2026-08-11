-- Run this once in the Supabase SQL Editor (after migration_13 has already run).
-- Each staff member's expected start/finish time, used by the future
-- clock-in/out reminder system. Admin/supervisor-only by design (same
-- access as Leave) - there is no RLS policy granting the staff member
-- themselves any access at all, so their own login cannot read or change
-- it (RLS default-denies with no matching policy), unlike every other
-- per-user table in this app.

create table public.staff_schedule (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  start_time time not null default '07:00',
  end_time time not null default '15:30',
  updated_at timestamptz not null default now()
);

alter table public.staff_schedule enable row level security;

create policy "Admins and supervisors can manage staff schedule" on public.staff_schedule
  for all using (public.is_admin_or_supervisor()) with check (public.is_admin_or_supervisor());
