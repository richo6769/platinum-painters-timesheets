import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createJob, setJobActive } from '@/lib/actions/jobs'

type Job = {
  id: string
  customer_name: string
  site_address: string
  notes: string | null
  is_active: boolean
}

export default async function JobsPage() {
  const supabase = await createClient()
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, customer_name, site_address, notes, is_active')
    .order('is_active', { ascending: false })
    .order('customer_name', { ascending: true })

  const jobList = (jobs ?? []) as Job[]
  const active = jobList.filter((j) => j.is_active)
  const archived = jobList.filter((j) => !j.is_active)

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Jobs</h1>
        <p className="text-sm text-black/60">
          Customers and sites your crew can clock in against.
        </p>
      </div>

      <form
        action={createJob}
        className="space-y-3 rounded-lg border border-black/10 p-4"
      >
        <h2 className="font-medium">Add a job</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="customer_name" className="text-sm font-medium">
              Customer name
            </label>
            <input
              id="customer_name"
              name="customer_name"
              required
              className="w-full rounded-md border border-black/20 px-3 py-2"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="site_address" className="text-sm font-medium">
              Site address
            </label>
            <input
              id="site_address"
              name="site_address"
              required
              className="w-full rounded-md border border-black/20 px-3 py-2"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label htmlFor="notes" className="text-sm font-medium">
            Notes (optional)
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            className="w-full rounded-md border border-black/20 px-3 py-2"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-black px-4 py-2 text-sm text-white"
        >
          Add job
        </button>
      </form>

      <JobList title="Active jobs" jobs={active} emptyText="No active jobs yet." />
      {archived.length > 0 && (
        <JobList title="Archived jobs" jobs={archived} emptyText="" />
      )}
    </div>
  )
}

function JobList({
  title,
  jobs,
  emptyText,
}: {
  title: string
  jobs: Job[]
  emptyText: string
}) {
  return (
    <div className="space-y-3">
      <h2 className="font-medium">{title}</h2>
      {jobs.length === 0 && <p className="text-sm text-black/60">{emptyText}</p>}
      <ul className="divide-y divide-black/10 rounded-lg border border-black/10">
        {jobs.map((job) => (
          <li key={job.id} className="flex items-center justify-between gap-4 p-3">
            <div>
              <Link href={`/admin/jobs/${job.id}`} className="font-medium underline">
                {job.customer_name}
              </Link>
              <p className="text-sm text-black/60">{job.site_address}</p>
            </div>
            <form action={setJobActive.bind(null, job.id, !job.is_active)}>
              <button type="submit" className="text-sm underline shrink-0">
                {job.is_active ? 'Archive' : 'Restore'}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  )
}
