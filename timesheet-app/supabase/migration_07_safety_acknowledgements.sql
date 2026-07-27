-- Run this once in the Supabase SQL Editor (after migration_06 has already run).
-- Records that a user has read and confirmed a site's Site Safety Plan.
-- Required once per (user, site) - checked server-side before the first
-- clock-in on a site that has a safety plan uploaded.

create table public.site_safety_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  acknowledged_at timestamptz not null default now(),
  unique (user_id, site_id)
);

alter table public.site_safety_acknowledgements enable row level security;

create policy "Users can view own safety acknowledgements" on public.site_safety_acknowledgements
  for select using (auth.uid() = user_id);

create policy "Users can insert own safety acknowledgements" on public.site_safety_acknowledgements
  for insert with check (auth.uid() = user_id);

-- So admins/supervisors have a record of who has confirmed reading it.
create policy "Admins and supervisors can view all safety acknowledgements"
  on public.site_safety_acknowledgements for select
  using (public.is_admin_or_supervisor());
