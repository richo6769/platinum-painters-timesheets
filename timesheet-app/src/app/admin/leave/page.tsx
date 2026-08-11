import { createClient } from '@/lib/supabase/server'
import { addLeave, deleteLeave } from '@/lib/actions/leave'
import { setStaffSchedule } from '@/lib/actions/schedule'
import { requireAdminOrSupervisor } from '@/lib/authGuards'

type LeaveRow = {
  id: string
  leave_type: 'sick' | 'annual'
  start_date: string
  end_date: string
  notes: string | null
  profiles: { full_name: string } | { full_name: string }[] | null
}

function staffName(relation: LeaveRow['profiles']): string {
  const p = Array.isArray(relation) ? relation[0] : relation
  return p?.full_name ?? 'Unknown'
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-NZ')
}

export default async function LeavePage() {
  await requireAdminOrSupervisor()

  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)

  const [{ data: staff }, { data: leave }, { data: schedules }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('is_active', true)
      .order('full_name'),
    supabase
      .from('staff_leave')
      .select('id, leave_type, start_date, end_date, notes, profiles(full_name)')
      .order('start_date', { ascending: false })
      .returns<LeaveRow[]>(),
    supabase.from('staff_schedule').select('user_id, start_time, end_time'),
  ])

  const upcoming = (leave ?? []).filter((l) => l.end_date >= today)
  const past = (leave ?? []).filter((l) => l.end_date < today)

  const scheduleByUser = new Map(
    (schedules ?? []).map((s) => [s.user_id, { start: s.start_time, end: s.end_time }])
  )

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Leave</h1>
        <p className="text-sm text-black/60">
          Everyone&apos;s expected to be working unless marked here - add sick or annual leave
          when someone lets you know in advance.
        </p>
      </div>

      <form action={addLeave} className="grid gap-3 rounded-lg border border-black/10 p-4 sm:grid-cols-2">
        <h2 className="font-medium sm:col-span-2">Add leave</h2>
        <div className="space-y-1">
          <label htmlFor="user_id" className="text-sm font-medium">
            Staff member
          </label>
          <select
            id="user_id"
            name="user_id"
            required
            className="w-full rounded-md border border-black/20 px-3 py-2"
          >
            {(staff ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="leave_type" className="text-sm font-medium">
            Type
          </label>
          <select
            id="leave_type"
            name="leave_type"
            required
            className="w-full rounded-md border border-black/20 px-3 py-2"
          >
            <option value="sick">Sick</option>
            <option value="annual">Annual</option>
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="start_date" className="text-sm font-medium">
            Start date
          </label>
          <input
            id="start_date"
            name="start_date"
            type="date"
            defaultValue={today}
            required
            className="w-full rounded-md border border-black/20 px-3 py-2"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="end_date" className="text-sm font-medium">
            End date (optional - defaults to start date)
          </label>
          <input
            id="end_date"
            name="end_date"
            type="date"
            className="w-full rounded-md border border-black/20 px-3 py-2"
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label htmlFor="notes" className="text-sm font-medium">
            Notes (optional)
          </label>
          <input
            id="notes"
            name="notes"
            className="w-full rounded-md border border-black/20 px-3 py-2"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-black px-4 py-2 text-sm text-white sm:col-span-2 sm:w-fit"
        >
          Add leave
        </button>
      </form>

      <LeaveList title="Current and upcoming" entries={upcoming} emptyText="No leave scheduled." />
      {past.length > 0 && <LeaveList title="Past" entries={past} emptyText="" />}

      <div className="space-y-3 border-t border-black/10 pt-6">
        <div>
          <h2 className="font-medium">Start &amp; finish times</h2>
          <p className="text-sm text-black/60">
            Admin/supervisor-only - staff can&apos;t see or change this. Used by clock-in/out
            reminders.
          </p>
        </div>
        <ul className="divide-y divide-black/10 rounded-lg border border-black/10">
          {(staff ?? []).map((person) => {
            const current = scheduleByUser.get(person.id)
            return (
              <li key={person.id} className="p-3">
                <form
                  action={setStaffSchedule.bind(null, person.id)}
                  className="flex flex-wrap items-center gap-3"
                >
                  <span className="flex-1 text-sm font-medium">{person.full_name}</span>
                  <label className="flex items-center gap-1 text-sm text-black/60">
                    Start
                    <input
                      name="start_time"
                      type="time"
                      defaultValue={current?.start ?? '07:00'}
                      className="rounded-md border border-black/20 px-2 py-1"
                    />
                  </label>
                  <label className="flex items-center gap-1 text-sm text-black/60">
                    Finish
                    <input
                      name="end_time"
                      type="time"
                      defaultValue={current?.end ?? '15:30'}
                      className="rounded-md border border-black/20 px-2 py-1"
                    />
                  </label>
                  <button type="submit" className="text-sm underline">
                    Save
                  </button>
                </form>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

function LeaveList({
  title,
  entries,
  emptyText,
}: {
  title: string
  entries: LeaveRow[]
  emptyText: string
}) {
  return (
    <div className="space-y-3">
      <h2 className="font-medium">{title}</h2>
      {entries.length === 0 && <p className="text-sm text-black/60">{emptyText}</p>}
      <ul className="divide-y divide-black/10 rounded-lg border border-black/10">
        {entries.map((entry) => (
          <li key={entry.id} className="flex items-center justify-between gap-3 p-3 text-sm">
            <div>
              <span className="font-medium">{staffName(entry.profiles)}</span>{' '}
              <span className="capitalize text-black/60">({entry.leave_type})</span>
              <p className="text-black/60">
                {entry.start_date === entry.end_date
                  ? formatDate(entry.start_date)
                  : `${formatDate(entry.start_date)} – ${formatDate(entry.end_date)}`}
                {entry.notes ? ` — ${entry.notes}` : ''}
              </p>
            </div>
            <form action={deleteLeave.bind(null, entry.id)}>
              <button type="submit" className="text-red-600 underline">
                Remove
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  )
}
