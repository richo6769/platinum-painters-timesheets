-- Run this once in the Supabase SQL Editor (after migration_11 has already run).
-- Lets a site have any number of additional named PDF documents, on top of
-- the two fixed ones (Extent of Work, Site Safety Plan). Files reuse the
-- existing "site-documents" storage bucket and its RLS policies (they
-- already apply to any path in that bucket, not just the two fixed ones).

create table public.site_documents (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  name text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

alter table public.site_documents enable row level security;

create policy "Authenticated users can view extra site documents"
  on public.site_documents for select to authenticated
  using (true);

create policy "Admins and supervisors can add extra site documents"
  on public.site_documents for insert to authenticated
  with check (public.is_admin_or_supervisor());

create policy "Admins can delete extra site documents"
  on public.site_documents for delete to authenticated
  using (public.is_admin());
