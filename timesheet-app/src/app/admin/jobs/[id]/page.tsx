import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateJob } from '@/lib/actions/jobs'

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: job } = await supabase
    .from('jobs')
    .select('id, customer_name, site_address, notes')
    .eq('id', id)
    .single()

  if (!job) {
    notFound()
  }

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold">Edit job</h1>
      <form action={updateJob.bind(null, job.id)} className="space-y-3">
        <div className="space-y-1">
          <label htmlFor="customer_name" className="text-sm font-medium">
            Customer name
          </label>
          <input
            id="customer_name"
            name="customer_name"
            defaultValue={job.customer_name}
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
            defaultValue={job.site_address}
            required
            className="w-full rounded-md border border-black/20 px-3 py-2"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="notes" className="text-sm font-medium">
            Notes (optional)
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={job.notes ?? ''}
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
    </div>
  )
}
