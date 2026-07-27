-- Run this once in the Supabase SQL Editor (after migration_05 has already run).
-- Lets an admin remove a staff member's access when they leave, without
-- deleting their profile or timesheet history (a hard delete would cascade
-- and wipe their past timesheet_entries, breaking historical reports).

alter table public.profiles
  add column is_active boolean not null default true;
