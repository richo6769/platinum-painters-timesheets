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
  extent_of_work_filename: string | null
  safety_plan_filename: string | null
  customers: CustomerRelation
}

type OpenEntrySite = {
  id: string
  name: string
  extent_of_work_filename: string | null
  safety_plan_filename: string | null
  customers: CustomerRelation
}

type OpenEntryRow = {
  id: string
  clock_in_at: string
  sites: OpenEntrySite | OpenEntrySite[] | null
}

function customerName(relation: CustomerRelation): string | undefined {
  return Array.isArray(relation) ? relation[0]?.name : relation?.name
}

export default async function ClockPage() {
  const profile = await getCurrentProfile()
  const supabase = await createClient()

  const [{ data: siteRows }, { data: openEntryRow }, { data: acknowledgements }] = await Promise.all([
    supabase
      .from('sites')
      .select('id, name, extent_of_work_filename, safety_plan_filename, customers(name)')
      .eq('is_active', true)
      .order('name')
      .returns<SiteRow[]>(),
    supabase
      .from('timesheet_entries')
      .select(
        'id, clock_in_at, sites(id, name, extent_of_work_filename, safety_plan_filename, customers(name))'
      )
      .eq('user_id', profile.id)
      .is('clock_out_at', null)
      .maybeSingle<OpenEntryRow>(),
    supabase
      .from('site_safety_acknowledgements')
      .select('site_id')
      .eq('user_id', profile.id),
  ])

  const acknowledgedSiteIds = new Set((acknowledgements ?? []).map((a) => a.site_id as string))

  const sites = (siteRows ?? []).map((s) => ({
    id: s.id,
    label: customerName(s.customers) ? `${s.name} (${customerName(s.customers)})` : s.name,
    hasExtentOfWork: Boolean(s.extent_of_work_filename),
    hasSafetyPlan: Boolean(s.safety_plan_filename),
    safetyAcknowledged: acknowledgedSiteIds.has(s.id),
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
        site_id: openEntrySite?.id ?? null,
        site_name: openEntrySite?.name ?? 'Site',
        hasExtentOfWork: Boolean(openEntrySite?.extent_of_work_filename),
        hasSafetyPlan: Boolean(openEntrySite?.safety_plan_filename),
      }
    : null

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
      <Image src="/logo.webp" alt="Platinum Painters" width={140} height={56} priority />
      <p className="text-sm text-black/60">Signed in as {profile.full_name}</p>
      <ClockWidget sites={sites} openEntry={openEntry} />
      <div className="flex flex-wrap items-center justify-center gap-2">
        {(profile.role === 'admin' || profile.role === 'supervisor') && (
          <Link
            href="/admin"
            className="rounded-lg bg-gray-300 px-3 py-1.5 text-xs font-medium text-gray-800 transition-colors hover:bg-gray-400"
          >
            Dashboard
          </Link>
        )}
        <Link
          href="/timesheet"
          className="rounded-lg bg-gray-300 px-3 py-1.5 text-xs font-medium text-gray-800 transition-colors hover:bg-gray-400"
        >
          My Timesheet
        </Link>
        <form action={logout}>
          <button className="rounded-lg bg-gray-300 px-3 py-1.5 text-xs font-medium text-gray-800 transition-colors hover:bg-gray-400">
            Sign out
          </button>
        </form>
      </div>
    </main>
  )
}
