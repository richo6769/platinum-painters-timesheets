import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/supabase/profile'
import { getReportEntries } from '@/lib/reports'
import { nzDateKey, nzTimeString, nzTodayDateString } from '@/lib/formatNZ'
import { WeeklyTimesheetReview } from './weekly-timesheet-review'

type CustomerRelation = { name: string } | { name: string }[] | null

type SiteRow = {
  id: string
  name: string
  customers: CustomerRelation
}

function customerName(relation: CustomerRelation): string | undefined {
  return Array.isArray(relation) ? relation[0]?.name : relation?.name
}

function mondayOf(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  const dow = d.getUTCDay() // 0 = Sunday .. 6 = Saturday
  const diffToMonday = dow === 0 ? -6 : 1 - dow
  d.setUTCDate(d.getUTCDate() + diffToMonday)
  return d.toISOString().slice(0, 10)
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

const DAY_LABELS = ['MON', 'TUE', 'WED', 'THUR', 'FRI', 'SAT', 'SUN']

export default async function WeeklyTimesheetPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const sp = await searchParams
  const requested = typeof sp.from === 'string' ? sp.from : ''

  const profile = await getCurrentProfile()
  const supabase = await createClient()

  const from = mondayOf(requested || nzTodayDateString())
  const to = addDays(from, 6)

  const [{ data: siteRows }, entries] = await Promise.all([
    supabase.from('sites').select('id, name, customers(name)').eq('is_active', true).order('name').returns<SiteRow[]>(),
    getReportEntries({ userId: profile.id, from, to }),
  ])

  const sites = (siteRows ?? []).map((s) => ({
    id: s.id,
    label: customerName(s.customers) ? `${s.name} (${customerName(s.customers)})` : s.name,
  }))

  const days = DAY_LABELS.map((label, i) => {
    const date = addDays(from, i)
    return {
      label,
      date,
      entries: entries
        .filter((e) => nzDateKey(e.clock_in_at) === date)
        .map((e) => ({
          id: e.id,
          siteId: e.site_id,
          siteName: e.site_name,
          start: nzTimeString(e.clock_in_at),
          finish: e.clock_out_at ? nzTimeString(e.clock_out_at) : null,
          breakMinutes: e.break_minutes,
          hours: e.hours,
        })),
    }
  })

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Weekly Timesheet</h1>
        <div className="flex gap-3 text-sm">
          <Link href="/timesheet" className="underline">
            My Timesheet
          </Link>
          <Link href="/clock" className="underline">
            Clock In/Out
          </Link>
        </div>
      </div>
      <p className="text-sm text-black/60">Signed in as {profile.full_name}</p>

      <div className="flex items-center justify-between text-sm">
        <Link href={`/timesheet/weekly?from=${addDays(from, -7)}`} className="underline">
          ← Previous week
        </Link>
        <span className="font-medium">
          Week ending {new Date(`${to}T00:00:00Z`).toLocaleDateString('en-NZ', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })}
        </span>
        <Link href={`/timesheet/weekly?from=${addDays(from, 7)}`} className="underline">
          Next week →
        </Link>
      </div>

      <WeeklyTimesheetReview days={days} sites={sites} from={from} to={to} />
    </div>
  )
}
