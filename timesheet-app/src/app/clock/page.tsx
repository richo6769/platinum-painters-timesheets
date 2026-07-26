import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/supabase/profile'
import { logout } from '@/lib/actions/auth'
import { ClockWidget } from './clock-widget'

type OpenEntryRow = {
  id: string
  clock_in_at: string
  jobs: { customer_name: string } | { customer_name: string }[] | null
}

export default async function ClockPage() {
  const profile = await getCurrentProfile()
  const supabase = await createClient()

  const [{ data: jobs }, { data: openEntryRow }] = await Promise.all([
    supabase
      .from('jobs')
      .select('id, customer_name, site_address')
      .eq('is_active', true)
      .order('customer_name'),
    supabase
      .from('timesheet_entries')
      .select('id, clock_in_at, jobs(customer_name)')
      .eq('user_id', profile.id)
      .is('clock_out_at', null)
      .maybeSingle<OpenEntryRow>(),
  ])

  const jobRelation = openEntryRow?.jobs
  const jobName = Array.isArray(jobRelation)
    ? jobRelation[0]?.customer_name
    : jobRelation?.customer_name

  const openEntry = openEntryRow
    ? {
        id: openEntryRow.id,
        clock_in_at: openEntryRow.clock_in_at,
        job_name: jobName ?? 'Job',
      }
    : null

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
      <p className="text-sm text-black/60">Signed in as {profile.full_name}</p>
      <ClockWidget jobs={jobs ?? []} openEntry={openEntry} />
      <form action={logout}>
        <button className="text-sm underline">Sign out</button>
      </form>
    </main>
  )
}
