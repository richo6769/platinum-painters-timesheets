import { createClient } from '@/lib/supabase/server'

type SupabaseClientLike = Awaited<ReturnType<typeof createClient>>

export type ReportFilters = {
  from?: string
  to?: string
  userId?: string
  siteId?: string
}

export type ReportEntry = {
  id: string
  user_name: string
  site_name: string
  customer_name: string
  clock_in_at: string
  clock_out_at: string | null
  break_minutes: number
  hours: number | null
  notes: string | null
  clock_in_map_url: string | null
  clock_out_map_url: string | null
}

type RawRow = {
  id: string
  clock_in_at: string
  clock_out_at: string | null
  break_minutes: number
  notes: string | null
  clock_in_lat: number | null
  clock_in_lng: number | null
  clock_out_lat: number | null
  clock_out_lng: number | null
  profiles: { full_name: string } | { full_name: string }[] | null
  sites:
    | { name: string; customers: { name: string } | { name: string }[] | null }
    | { name: string; customers: { name: string } | { name: string }[] | null }[]
    | null
}

export function mapUrl(lat: number | null, lng: number | null): string | null {
  if (lat === null || lng === null) return null
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
}

export async function getReportEntries(
  filters: ReportFilters,
  client?: SupabaseClientLike
): Promise<ReportEntry[]> {
  const supabase = client ?? (await createClient())

  let query = supabase
    .from('timesheet_entries')
    .select(
      'id, clock_in_at, clock_out_at, break_minutes, notes, clock_in_lat, clock_in_lng, clock_out_lat, clock_out_lng, profiles(full_name), sites(name, customers(name))'
    )
    .order('clock_in_at', { ascending: false })

  if (filters.from) query = query.gte('clock_in_at', `${filters.from}T00:00:00`)
  if (filters.to) query = query.lte('clock_in_at', `${filters.to}T23:59:59.999`)
  if (filters.userId) query = query.eq('user_id', filters.userId)
  if (filters.siteId) query = query.eq('site_id', filters.siteId)

  const { data } = await query.returns<RawRow[]>()

  return (data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    const site = Array.isArray(row.sites) ? row.sites[0] : row.sites
    const customer = site ? (Array.isArray(site.customers) ? site.customers[0] : site.customers) : null
    const clockIn = new Date(row.clock_in_at).getTime()
    const clockOut = row.clock_out_at ? new Date(row.clock_out_at).getTime() : null

    const grossHours = clockOut ? (clockOut - clockIn) / 3600000 : null

    return {
      id: row.id,
      user_name: profile?.full_name ?? 'Unknown',
      site_name: site?.name ?? 'Unknown',
      customer_name: customer?.name ?? '',
      clock_in_at: row.clock_in_at,
      clock_out_at: row.clock_out_at,
      break_minutes: row.break_minutes,
      hours: grossHours !== null ? Math.round((grossHours - row.break_minutes / 60) * 100) / 100 : null,
      notes: row.notes,
      clock_in_map_url: mapUrl(row.clock_in_lat, row.clock_in_lng),
      clock_out_map_url: mapUrl(row.clock_out_lat, row.clock_out_lng),
    }
  })
}
