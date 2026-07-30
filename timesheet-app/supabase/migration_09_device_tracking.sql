-- Run this once in the Supabase SQL Editor (after migration_08 has already run).
-- Tags each clock-in AND clock-out with the device that made it, so an
-- admin can spot the same device being used to clock in/out as two
-- different people.

alter table public.timesheet_entries
  add column clock_in_device_id text,
  add column clock_in_device_label text,
  add column clock_out_device_id text,
  add column clock_out_device_label text;
