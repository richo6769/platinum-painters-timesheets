import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createSite, setSiteActive } from '@/lib/actions/sites'

type SiteRow = {
  id: string
  name: string
  address: string | null
  is_active: boolean
  customers: { name: string } | { name: string }[] | null
}

export default async function SitesPage() {
  const supabase = await createClient()
  const [{ data: sites }, { data: customers }] = await Promise.all([
    supabase
      .from('sites')
      .select('id, name, address, is_active, customers(name)')
      .order('is_active', { ascending: false })
      .order('name', { ascending: true }),
    supabase
      .from('customers')
      .select('id, name')
      .eq('is_active', true)
      .order('name'),
  ])

  const siteList = (sites ?? []) as SiteRow[]
  const active = siteList.filter((s) => s.is_active)
  const archived = siteList.filter((s) => !s.is_active)

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Sites</h1>
        <p className="text-sm text-black/60">
          Belong to a customer. Crew can only clock in against active sites.
        </p>
      </div>

      <form action={createSite} className="space-y-3 rounded-lg border border-black/10 p-4">
        <h2 className="font-medium">Add a site</h2>
        {(customers ?? []).length === 0 ? (
          <p className="text-sm text-black/60">
            Add an active customer first before adding a site.
          </p>
        ) : (
          <>
            <div className="space-y-1">
              <label htmlFor="customer_id" className="text-sm font-medium">
                Customer
              </label>
              <select
                id="customer_id"
                name="customer_id"
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
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="name" className="text-sm font-medium">
                  Site name
                </label>
                <input
                  id="name"
                  name="name"
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
                  className="w-full rounded-md border border-black/20 px-3 py-2"
                />
              </div>
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
            <button
              type="submit"
              className="rounded-md bg-black px-4 py-2 text-sm text-white"
            >
              Add site
            </button>
          </>
        )}
      </form>

      <SiteList title="Active sites" sites={active} emptyText="No active sites yet." />
      {archived.length > 0 && <SiteList title="Archived sites" sites={archived} emptyText="" />}
    </div>
  )
}

function SiteList({
  title,
  sites,
  emptyText,
}: {
  title: string
  sites: SiteRow[]
  emptyText: string
}) {
  return (
    <div className="space-y-3">
      <h2 className="font-medium">{title}</h2>
      {sites.length === 0 && <p className="text-sm text-black/60">{emptyText}</p>}
      <ul className="divide-y divide-black/10 rounded-lg border border-black/10">
        {sites.map((site) => {
          const customer = Array.isArray(site.customers) ? site.customers[0] : site.customers
          return (
            <li key={site.id} className="flex items-center justify-between gap-4 p-3">
              <div>
                <Link href={`/admin/sites/${site.id}`} className="font-medium underline">
                  {site.name}
                </Link>
                <p className="text-sm text-black/60">
                  {customer?.name ?? 'Unknown customer'}
                  {site.address ? ` — ${site.address}` : ''}
                </p>
              </div>
              <form action={setSiteActive.bind(null, site.id, !site.is_active)}>
                <button type="submit" className="text-sm underline shrink-0">
                  {site.is_active ? 'Archive' : 'Restore'}
                </button>
              </form>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
