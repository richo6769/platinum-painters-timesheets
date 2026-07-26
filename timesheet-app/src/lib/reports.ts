import { createClient } from '@/lib/supabase/server'

export type ReportFilters = {
  from?: string
  to?: string
  userId?: string
  jobId?: string
}

export type ReportEntry = {
  id: string
  user_name: string
  job_name: string
  site_address: string
  clock_in_at: string
  clock_out_at: string | null
  hours: number | null
  notes: string | null
  has_gps: boolean
}

type RawRow = {
  id: string
  clock_in_at: string
  clock_out_at: string | null
  notes: string | null
  clock_in_lat: number | null
  clock_in_lng: number | null
  profiles: { full_name: string } | { full_name: string }[] | null
  jobs: { customer_name: string; site_address: string } | { customer_name: string; site_address: string }[] | null
}

export async function getReportEntries(filters: ReportFilters): Promise<ReportEntry[]> {
  const supabase = await createClient()

  let query = supabase
    .from('timesheet_entries')
    .select(
      'id, clock_in_at, clock_out_at, notes, clock_in_lat, clock_in_lng, profiles(full_name), jobs(customer_name, site_address)'
    )
    .order('clock_in_at', { ascending: false })

  if (filters.from) query = query.gte('clock_in_at', `${filters.from}T00:00:00`)
  if (filters.to) query = query.lte('clock_in_at', `${filters.to}T23:59:59.999`)
  if (filters.userId) query = query.eq('user_id', filters.userId)
  if (filters.jobId) query = query.eq('job_id', filters.jobId)

  const { data } = await query.returns<RawRow[]>()

  return (data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    const job = Array.isArray(row.jobs) ? row.jobs[0] : row.jobs
    const clockIn = new Date(row.clock_in_at).getTime()
    const clockOut = row.clock_out_at ? new Date(row.clock_out_at).getTime() : null

    return {
      id: row.id,
      user_name: profile?.full_name ?? 'Unknown',
      job_name: job?.customer_name ?? 'Unknown',
      site_address: job?.site_address ?? '',
      clock_in_at: row.clock_in_at,
      clock_out_at: row.clock_out_at,
      hours: clockOut ? Math.round(((clockOut - clockIn) / 3600000) * 100) / 100 : null,
      notes: row.notes,
      has_gps: Boolean(row.clock_in_lat && row.clock_in_lng),
    }
  })
}
