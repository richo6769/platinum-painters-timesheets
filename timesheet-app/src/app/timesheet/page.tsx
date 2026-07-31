import Link from 'next/link'
import { getCurrentProfile } from '@/lib/supabase/profile'
import { getReportEntries } from '@/lib/reports'
import { TimesheetTable } from './timesheet-table'

export default async function TimesheetPage() {
  const profile = await getCurrentProfile()
  const entries = await getReportEntries({ userId: profile.id })

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">My Timesheet</h1>
        <Link href="/clock" className="text-sm underline">
          Back to Clock In/Out
        </Link>
      </div>
      <TimesheetTable entries={entries} />
    </div>
  )
}
