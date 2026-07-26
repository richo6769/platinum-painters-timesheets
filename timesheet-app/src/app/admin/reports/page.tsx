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
  const siteId = typeof sp.siteId === 'string' ? sp.siteId : ''

  const supabase = await createClient()
  const [{ data: crew }, { data: sites }, entries] = await Promise.all([
    supabase.from('profiles').select('id, full_name').order('full_name'),
    supabase.from('sites').select('id, name').order('name'),
    getReportEntries({ from, to, userId, siteId }),
  ])

  const totalHours = entries.reduce((sum, e) => sum + (e.hours ?? 0), 0)

  const exportParams = new URLSearchParams()
  if (from) exportParams.set('from', from)
  if (to) exportParams.set('to', to)
  if (userId) exportParams.set('userId', userId)
  if (siteId) exportParams.set('siteId', siteId)

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
          <label htmlFor="siteId" className="text-sm font-medium">
            Site
          </label>
          <select
            id="siteId"
            name="siteId"
            defaultValue={siteId}
            className="rounded-md border border-black/20 px-3 py-2"
          >
            <option value="">All sites</option>
            {(sites ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
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
              <th className="p-3">Site</th>
              <th className="p-3">Clock in</th>
              <th className="p-3">Clock out</th>
              <th className="p-3">Break</th>
              <th className="p-3">Hours</th>
              <th className="p-3">Notes</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/10">
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="p-3">{e.user_name}</td>
                <td className="p-3">{e.site_name}</td>
                <td className="p-3">
                  {new Date(e.clock_in_at).toLocaleString()}
                  {e.clock_in_map_url && (
                    <>
                      {' '}
                      <a href={e.clock_in_map_url} target="_blank" className="text-xs underline">
                        Map
                      </a>
                    </>
                  )}
                </td>
                <td className="p-3">
                  {e.clock_out_at ? new Date(e.clock_out_at).toLocaleString() : 'In progress'}
                  {e.clock_out_map_url && (
                    <>
                      {' '}
                      <a href={e.clock_out_map_url} target="_blank" className="text-xs underline">
                        Map
                      </a>
                    </>
                  )}
                </td>
                <td className="p-3">{e.break_minutes > 0 ? `${e.break_minutes}m` : '—'}</td>
                <td className="p-3">{e.hours ?? '—'}</td>
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
