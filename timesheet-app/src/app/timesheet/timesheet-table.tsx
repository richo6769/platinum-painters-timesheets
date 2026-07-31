import { formatNZDateTime } from '@/lib/formatNZ'
import type { ReportEntry } from '@/lib/reports'

export function TimesheetTable({ entries }: { entries: ReportEntry[] }) {
  const totalHours = entries.reduce((sum, e) => sum + (e.hours ?? 0), 0)

  return (
    <div className="space-y-3">
      <p className="text-sm text-black/60">
        {entries.length} shift{entries.length === 1 ? '' : 's'} · {totalHours.toFixed(2)} total hours
      </p>
      <div className="overflow-x-auto rounded-lg border border-black/10">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 bg-black/5">
            <tr>
              <th className="p-3">Site</th>
              <th className="p-3">Clock in</th>
              <th className="p-3">Clock out</th>
              <th className="p-3">Break</th>
              <th className="p-3">Hours</th>
              <th className="p-3">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/10">
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="p-3">{e.site_name}</td>
                <td className="p-3">{formatNZDateTime(e.clock_in_at)}</td>
                <td className="p-3">
                  {e.clock_out_at ? formatNZDateTime(e.clock_out_at) : 'In progress'}
                </td>
                <td className="p-3">{e.break_minutes > 0 ? `${e.break_minutes}m` : '—'}</td>
                <td className="p-3">{e.hours ?? '—'}</td>
                <td className="max-w-xs truncate p-3">{e.notes ?? ''}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-black/60">
                  No shifts recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
