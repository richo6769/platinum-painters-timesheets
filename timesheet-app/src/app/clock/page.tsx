import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/supabase/profile'
import { logout } from '@/lib/actions/auth'
import { ClockWidget } from './clock-widget'

type CustomerRelation = { name: string } | { name: string }[] | null

type SiteRow = {
  id: string
  name: string
  customers: CustomerRelation
}

type OpenEntryRow = {
  id: string
  clock_in_at: string
  sites: ({ name: string; customers: CustomerRelation }) | ({ name: string; customers: CustomerRelation }[]) | null
}

function customerName(relation: CustomerRelation): string | undefined {
  return Array.isArray(relation) ? relation[0]?.name : relation?.name
}

export default async function ClockPage() {
  const profile = await getCurrentProfile()
  const supabase = await createClient()

  const [{ data: siteRows }, { data: openEntryRow }] = await Promise.all([
    supabase
      .from('sites')
      .select('id, name, customers(name)')
      .eq('is_active', true)
      .order('name')
      .returns<SiteRow[]>(),
    supabase
      .from('timesheet_entries')
      .select('id, clock_in_at, sites(name, customers(name))')
      .eq('user_id', profile.id)
      .is('clock_out_at', null)
      .maybeSingle<OpenEntryRow>(),
  ])

  const sites = (siteRows ?? []).map((s) => ({
    id: s.id,
    label: customerName(s.customers) ? `${s.name} (${customerName(s.customers)})` : s.name,
  }))

  const openEntrySite = openEntryRow?.sites
    ? Array.isArray(openEntryRow.sites)
      ? openEntryRow.sites[0]
      : openEntryRow.sites
    : null

  const openEntry = openEntryRow
    ? {
        id: openEntryRow.id,
        clock_in_at: openEntryRow.clock_in_at,
        site_name: openEntrySite?.name ?? 'Site',
      }
    : null

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
      <Image src="/logo.webp" alt="Platinum Painters" width={140} height={56} priority />
      <p className="text-sm text-black/60">Signed in as {profile.full_name}</p>
      <ClockWidget sites={sites} openEntry={openEntry} />
      <div className="flex items-center gap-4">
        {profile.role === 'admin' && (
          <Link href="/admin" className="text-sm underline">
            Dashboard
          </Link>
        )}
        <form action={logout}>
          <button className="text-sm underline">Sign out</button>
        </form>
      </div>
    </main>
  )
}
