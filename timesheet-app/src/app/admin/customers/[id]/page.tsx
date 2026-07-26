import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateCustomer } from '@/lib/actions/customers'
import { requireAdmin } from '@/lib/authGuards'

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdmin()

  const { id } = await params
  const supabase = await createClient()
  const { data: customer } = await supabase
    .from('customers')
    .select('id, name, contact_person')
    .eq('id', id)
    .single()

  if (!customer) {
    notFound()
  }

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold">Edit customer</h1>
      <form action={updateCustomer.bind(null, customer.id)} className="space-y-3">
        <div className="space-y-1">
          <label htmlFor="name" className="text-sm font-medium">
            Customer name
          </label>
          <input
            id="name"
            name="name"
            defaultValue={customer.name}
            required
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
            defaultValue={customer.contact_person ?? ''}
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
