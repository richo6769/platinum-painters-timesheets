-- Run this once in the Supabase SQL Editor (after migration_10 has already run).
-- Lets a staff member be tagged with a staff type (Painter, Contractor,
-- Apprentice, etc.) from the Manage Staff Types list, separate from their
-- permission role (admin/supervisor/painter).

alter table public.profiles
  add column staff_type_id uuid references public.staff_types(id) on delete set null;
