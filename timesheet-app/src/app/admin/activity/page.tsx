import { createClient } from '@/lib/supabase/server'
import { mapUrl } from '@/lib/reports'

type CustomerRelation = { name: string } | { name: string }[] | null
type SiteRelation =
  | { name: string; customers: CustomerRelation }
  | { name: string; customers: CustomerRelation }[]
  | null

type OpenEntryRow = {
  id: string
  clock_in_at: string
  clock_in_lat: number | null
  clock_in_lng: number | null
  profiles: { full_name: string } | { full_name: string }[] | null
  sites: SiteRelation
}

function first<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function elapsedSince(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime())
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return `${h}h ${String(m).padStart(2, '0')}m`
}

export default async function ActivityPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('timesheet_entries')
    .select('id, clock_in_at, clock_in_lat, clock_in_lng, profiles(full_name), sites(name, customers(name))')
    .is('clock_out_at', null)
    .order('clock_in_at', { ascending: true })
    .returns<OpenEntryRow[]>()

  const rows = (data ?? []).map((row) => {
    const profile = first(row.profiles)
    const site = first(row.sites)
    const customer = site ? first(site.customers) : null
    return {
      id: row.id,
      name: profile?.full_name ?? 'Unknown',
      siteName: site?.name ?? 'Unknown',
      customerName: customer?.name ?? '',
      since: row.clock_in_at,
      mapUrl: mapUrl(row.clock_in_lat, row.clock_in_lng),
    }
  })

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Activity</h1>
        <p className="text-sm text-black/60">
          Crew currently clocked in. Reload the page to refresh.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-black/60">No one is currently clocked in.</p>
      ) : (
        <ul className="divide-y divide-black/10 rounded-lg border border-black/10">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-4 p-3">
              <div>
                <p className="font-medium">{row.name}</p>
                <p className="text-sm text-black/60">
                  {row.siteName}
                  {row.customerName ? ` (${row.customerName})` : ''}
                </p>
              </div>
              <div className="text-right text-sm">
                <p className="font-medium tabular-nums">{elapsedSince(row.since)}</p>
                {row.mapUrl && (
                  <a href={row.mapUrl} target="_blank" className="underline">
                    Map
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
