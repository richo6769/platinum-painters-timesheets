import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateSite } from '@/lib/actions/sites'
import { requireAdmin } from '@/lib/authGuards'

export default async function EditSitePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdmin()

  const { id } = await params
  const supabase = await createClient()

  const [{ data: site }, { data: customers }] = await Promise.all([
    supabase
      .from('sites')
      .select('id, customer_id, name, address, contact_person')
      .eq('id', id)
      .single(),
    supabase.from('customers').select('id, name').order('name'),
  ])

  if (!site) {
    notFound()
  }

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold">Edit site</h1>
      <form action={updateSite.bind(null, site.id)} className="space-y-3">
        <div className="space-y-1">
          <label htmlFor="customer_id" className="text-sm font-medium">
            Customer
          </label>
          <select
            id="customer_id"
            name="customer_id"
            defaultValue={site.customer_id}
            required
            className="w-full rounded-md border border-black/20 px-3 py-2"
          >
            {(customers ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="name" className="text-sm font-medium">
            Site name
          </label>
          <input
            id="name"
            name="name"
            defaultValue={site.name}
            required
            className="w-full rounded-md border border-black/20 px-3 py-2"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="address" className="text-sm font-medium">
            Address (optional)
          </label>
          <input
            id="address"
            name="address"
            defaultValue={site.address ?? ''}
            className="w-full rounded-md border border-black/20 px-3 py-2"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="contact_person" className="text-sm font-medium">
            Contact person (optional)
          </label>
          <input
            id="contact_person"
            name="contact_person"
            defaultValue={site.contact_person ?? ''}
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
