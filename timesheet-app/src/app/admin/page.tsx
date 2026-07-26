import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { count } = await supabase
    .from('timesheet_entries')
    .select('id', { count: 'exact', head: true })
    .is('clock_out_at', null)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <p className="text-sm text-black/60">
        <Link href="/admin/activity" className="underline">
          {count ?? 0} crew currently clocked in
        </Link>
      </p>
      <ul className="list-inside list-disc space-y-1">
        <li>
          <Link href="/admin/customers" className="underline">
            Manage customers
          </Link>
        </li>
        <li>
          <Link href="/admin/sites" className="underline">
            Manage sites
          </Link>
        </li>
        <li>
          <Link href="/admin/staff" className="underline">
            Manage staff
          </Link>
        </li>
        <li>
          <Link href="/admin/reports" className="underline">
            Timesheet reports
          </Link>
        </li>
      </ul>
    </div>
  )
}
