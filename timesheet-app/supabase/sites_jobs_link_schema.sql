-- Platinum Timesheets — link sites to Hub jobs
-- Run this once in the Supabase SQL Editor (same project the Hub uses).
-- Safe to re-run: column creation is guarded.
--
-- Every clock-in site now corresponds to a Hub job; only a job that's
-- "in_progress" is clockable (see src/app/clock/page.tsx). Existing sites
-- get backfilled by a one-off script (scripts/link-sites-to-jobs.mjs) —
-- this migration only adds the column.

alter table public.sites add column if not exists job_id uuid references public.jobs(id);
