import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateEntry, deleteEntry } from '@/lib/actions/entries'

function toLocalInputValue(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`
}

export default async function EditEntryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: entry }, { data: jobs }] = await Promise.all([
    supabase
      .from('timesheet_entries')
      .select('id, job_id, clock_in_at, clock_out_at, notes, profiles(full_name)')
      .eq('id', id)
      .single(),
    supabase.from('jobs').select('id, customer_name').order('customer_name'),
  ])

  if (!entry) {
    notFound()
  }

  const crewProfile = Array.isArray(entry.profiles) ? entry.profiles[0] : entry.profiles
  const crewName = crewProfile?.full_name

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold">Edit entry</h1>
      <p className="text-sm text-black/60">Crew: {crewName ?? 'Unknown'}</p>

      <form action={updateEntry.bind(null, entry.id)} className="space-y-3">
        <div className="space-y-1">
          <label htmlFor="job_id" className="text-sm font-medium">
            Job
          </label>
          <select
            id="job_id"
            name="job_id"
            defaultValue={entry.job_id}
            required
            className="w-full rounded-md border border-black/20 px-3 py-2"
          >
            {(jobs ?? []).map((j) => (
              <option key={j.id} value={j.id}>
                {j.customer_name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="clock_in_at" className="text-sm font-medium">
            Clock in
          </label>
          <input
            id="clock_in_at"
            name="clock_in_at"
            type="datetime-local"
            defaultValue={toLocalInputValue(entry.clock_in_at)}
            required
            className="w-full rounded-md border border-black/20 px-3 py-2"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="clock_out_at" className="text-sm font-medium">
            Clock out
          </label>
          <input
            id="clock_out_at"
            name="clock_out_at"
            type="datetime-local"
            defaultValue={toLocalInputValue(entry.clock_out_at)}
            className="w-full rounded-md border border-black/20 px-3 py-2"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="notes" className="text-sm font-medium">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={entry.notes ?? ''}
            className="w-full rounded-md border border-black/20 px-3 py-2"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-black px-4 py-2 text-sm text-white"
        >
          Save changes
        </button>
      </form>

      <form action={deleteEntry.bind(null, entry.id)}>
        <button type="submit" className="text-sm text-red-600 underline">
          Delete entry
        </button>
      </form>
    </div>
  )
}
