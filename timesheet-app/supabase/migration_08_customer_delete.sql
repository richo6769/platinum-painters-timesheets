-- Run this once in the Supabase SQL Editor (after migration_07 has already run).
-- Customers never had a delete policy - only select/insert/update - so
-- deleting a customer silently affected zero rows under RLS.

create policy "Admins can delete customers" on public.customers
  for delete using (public.is_admin());
