import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getReportEntries } from '@/lib/reports'

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const sp = await searchParams
  const from = typeof sp.from === 'string' ? sp.from : ''
  const to = typeof sp.to === 'string' ? sp.to : ''
  const userId = typeof sp.userId === 'string' ? sp.userId : ''
  const jobId = typeof sp.jobId === 'string' ? sp.jobId : ''

  const supabase = await createClient()
  const [{ data: crew }, { data: jobs }, entries] = await Promise.all([
    supabase.from('profiles').select('id, full_name').order('full_name'),
    supabase.from('jobs').select('id, customer_name').order('customer_name'),
    getReportEntries({ from, to, userId, jobId }),
  ])

  const totalHours = entries.reduce((sum, e) => sum + (e.hours ?? 0), 0)

  const exportParams = new URLSearchParams()
  if (from) exportParams.set('from', from)
  if (to) exportParams.set('to', to)
  if (userId) exportParams.set('userId', userId)
  if (jobId) exportParams.set('jobId', jobId)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Reports</h1>
          <p className="text-sm text-black/60">
            {entries.length} entries · {totalHours.toFixed(2)} total hours
          </p>
        </div>
        <a
          href={`/api/reports/export?${exportParams.toString()}`}
          className="rounded-md bg-black px-4 py-2 text-sm text-white"
        >
          Export CSV
        </a>
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-lg border border-black/10 p-4">
        <div className="space-y-1">
          <label htmlFor="from" className="text-sm font-medium">
            From
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={from}
            className="rounded-md border border-black/20 px-3 py-2"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="to" className="text-sm font-medium">
            To
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={to}
            className="rounded-md border border-black/20 px-3 py-2"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="userId" className="text-sm font-medium">
            Crew
          </label>
          <select
            id="userId"
            name="userId"
            defaultValue={userId}
            className="rounded-md border border-black/20 px-3 py-2"
          >
            <option value="">All crew</option>
            {(crew ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="jobId" className="text-sm font-medium">
            Job
          </label>
          <select
            id="jobId"
            name="jobId"
            defaultValue={jobId}
            className="rounded-md border border-black/20 px-3 py-2"
          >
            <option value="">All jobs</option>
            {(jobs ?? []).map((j) => (
              <option key={j.id} value={j.id}>
                {j.customer_name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md border border-black/20 px-4 py-2 text-sm"
        >
          Filter
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-black/10">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 bg-black/5">
            <tr>
              <th className="p-3">Crew</th>
              <th className="p-3">Job</th>
              <th className="p-3">Clock in</th>
              <th className="p-3">Clock out</th>
              <th className="p-3">Hours</th>
              <th className="p-3">GPS</th>
              <th className="p-3">Notes</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/10">
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="p-3">{e.user_name}</td>
                <td className="p-3">{e.job_name}</td>
                <td className="p-3">{new Date(e.clock_in_at).toLocaleString()}</td>
                <td className="p-3">
                  {e.clock_out_at ? new Date(e.clock_out_at).toLocaleString() : 'In progress'}
                </td>
                <td className="p-3">{e.hours ?? '—'}</td>
                <td className="p-3">{e.has_gps ? '✓' : '—'}</td>
                <td className="max-w-xs truncate p-3">{e.notes ?? ''}</td>
                <td className="p-3">
                  <Link href={`/admin/reports/${e.id}/edit`} className="underline">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-black/60">
                  No entries match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
