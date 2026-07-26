import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createCustomer, setCustomerActive } from '@/lib/actions/customers'

type Customer = {
  id: string
  name: string
  contact_person: string | null
  is_active: boolean
}

export default async function CustomersPage() {
  const supabase = await createClient()
  const { data: customers } = await supabase
    .from('customers')
    .select('id, name, contact_person, is_active')
    .order('is_active', { ascending: false })
    .order('name', { ascending: true })

  const customerList = (customers ?? []) as Customer[]
  const active = customerList.filter((c) => c.is_active)
  const archived = customerList.filter((c) => !c.is_active)

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Customers</h1>
        <p className="text-sm text-black/60">Admin-only. Sites belong to a customer.</p>
      </div>

      <form
        action={createCustomer}
        className="space-y-3 rounded-lg border border-black/10 p-4"
      >
        <h2 className="font-medium">Add a customer</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="name" className="text-sm font-medium">
              Customer name
            </label>
            <input
              id="name"
              name="name"
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
              className="w-full rounded-md border border-black/20 px-3 py-2"
            />
          </div>
        </div>
        <button
          type="submit"
          className="rounded-md bg-black px-4 py-2 text-sm text-white"
        >
          Add customer
        </button>
      </form>

      <CustomerList title="Active customers" customers={active} emptyText="No active customers yet." />
      {archived.length > 0 && (
        <CustomerList title="Archived customers" customers={archived} emptyText="" />
      )}
    </div>
  )
}

function CustomerList({
  title,
  customers,
  emptyText,
}: {
  title: string
  customers: Customer[]
  emptyText: string
}) {
  return (
    <div className="space-y-3">
      <h2 className="font-medium">{title}</h2>
      {customers.length === 0 && <p className="text-sm text-black/60">{emptyText}</p>}
      <ul className="divide-y divide-black/10 rounded-lg border border-black/10">
        {customers.map((customer) => (
          <li key={customer.id} className="flex items-center justify-between gap-4 p-3">
            <div>
              <Link href={`/admin/customers/${customer.id}`} className="font-medium underline">
                {customer.name}
              </Link>
              {customer.contact_person && (
                <p className="text-sm text-black/60">{customer.contact_person}</p>
              )}
            </div>
            <form action={setCustomerActive.bind(null, customer.id, !customer.is_active)}>
              <button type="submit" className="text-sm underline shrink-0">
                {customer.is_active ? 'Archive' : 'Restore'}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  )
}
