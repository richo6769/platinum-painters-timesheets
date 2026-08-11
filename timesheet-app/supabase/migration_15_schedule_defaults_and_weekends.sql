-- Run this once in the Supabase SQL Editor (after migration_14 has already run).
-- Update default start/finish time, and add per-staff weekend flags -
-- everyone's assumed Monday-Friday by default; these mark someone as also
-- working a Saturday and/or Sunday. Used by the future clock-in/out
-- reminder system (which will also skip NZ public holidays on weekdays).

alter table public.staff_schedule
  alter column start_time set default '07:30',
  alter column end_time set default '16:00';

alter table public.staff_schedule
  add column works_saturday boolean not null default false,
  add column works_sunday boolean not null default false;
