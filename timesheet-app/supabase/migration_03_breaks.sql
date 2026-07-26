-- Run this once in the Supabase SQL Editor (after migration_02 has already run).
-- Adds break tracking to timesheet entries.

alter table public.timesheet_entries
  add column break_minutes integer not null default 0 check (break_minutes >= 0);
