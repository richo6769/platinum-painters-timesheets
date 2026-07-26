import Link from 'next/link'

export default function AdminDashboard() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <ul className="list-inside list-disc space-y-1">
        <li>
          <Link href="/admin/jobs" className="underline">
            Manage jobs
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
