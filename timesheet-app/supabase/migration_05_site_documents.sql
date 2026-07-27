-- Run this once in the Supabase SQL Editor (after migration_04 has already run).
-- Adds optional per-site PDF documents: "Extent of Work" and "Site Specific
-- Safety Plan". Files live in a private Storage bucket; these columns just
-- record the original filename (and therefore whether a document exists).

alter table public.sites
  add column extent_of_work_filename text,
  add column safety_plan_filename text;

-- ── storage bucket (private — files are only reachable via signed URLs) ──
insert into storage.buckets (id, name, public)
values ('site-documents', 'site-documents', false)
on conflict (id) do nothing;

-- Any signed-in staff member can view a site document (same trust level as
-- reading the site list itself). Uploading is admin/supervisor (matches
-- "can add sites"); replacing or deleting an existing file is admin-only
-- (matches "can't edit/archive sites").
create policy "Authenticated users can view site documents"
  on storage.objects for select to authenticated
  using (bucket_id = 'site-documents');

create policy "Admins and supervisors can upload site documents"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'site-documents' and public.is_admin_or_supervisor());

create policy "Admins can replace site documents"
  on storage.objects for update to authenticated
  using (bucket_id = 'site-documents' and public.is_admin())
  with check (bucket_id = 'site-documents' and public.is_admin());

create policy "Admins can delete site documents"
  on storage.objects for delete to authenticated
  using (bucket_id = 'site-documents' and public.is_admin());
