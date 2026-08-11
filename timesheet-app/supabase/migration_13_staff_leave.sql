-- Run this once in the Supabase SQL Editor (after migration_12 has already run).
-- Everyone defaults to "expected to be working" - this table records the
-- exceptions (sick/annual leave) an admin marks when a staff member lets
-- them know in advance. Used to skip clock-in reminders for anyone on
-- leave that day, and to see at a glance who's off.

create table public.staff_leave (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  leave_type text not null check (leave_type in ('sick', 'annual')),
  start_date date not null,
  end_date date not null,
  notes text,
  created_at timestamptz not null default now(),
  constraint staff_leave_date_order check (end_date >= start_date)
);

create index staff_leave_user_date_idx on public.staff_leave (user_id, start_date, end_date);

alter table public.staff_leave enable row level security;

create policy "Admins and supervisors can view staff leave" on public.staff_leave
  for select using (public.is_admin_or_supervisor());

create policy "Admins and supervisors can add staff leave" on public.staff_leave
  for insert with check (public.is_admin_or_supervisor());

create policy "Admins and supervisors can delete staff leave" on public.staff_leave
  for delete using (public.is_admin_or_supervisor());
