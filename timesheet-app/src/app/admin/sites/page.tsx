import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createSite, setSiteActive } from '@/lib/actions/sites'
import { getCurrentProfile } from '@/lib/supabase/profile'

type SiteRow = {
  id: string
  name: string
  address: string | null
  is_active: boolean
  extent_of_work_filename: string | null
  safety_plan_filename: string | null
  customers: { name: string } | { name: string }[] | null
}

export default async function SitesPage() {
  const profile = await getCurrentProfile()
  const canEdit = profile.role === 'admin'

  const supabase = await createClient()
  const [{ data: sites }, { data: customers }] = await Promise.all([
    supabase
      .from('sites')
      .select(
        'id, name, address, is_active, extent_of_work_filename, safety_plan_filename, customers(name)'
      )
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
          Belong to a customer. Painters can only clock in against active sites.
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
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="extent_of_work" className="text-sm font-medium">
                  Extent of Work (PDF, optional)
                </label>
                <input
                  id="extent_of_work"
                  name="extent_of_work"
                  type="file"
                  accept="application/pdf"
                  className="w-full rounded-md border border-black/20 px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="safety_plan" className="text-sm font-medium">
                  Site Safety Plan (PDF, optional)
                </label>
                <input
                  id="safety_plan"
                  name="safety_plan"
                  type="file"
                  accept="application/pdf"
                  className="w-full rounded-md border border-black/20 px-3 py-2 text-sm"
                />
              </div>
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

      <SiteList title="Active sites" sites={active} emptyText="No active sites yet." canEdit={canEdit} />
      {archived.length > 0 && (
        <SiteList title="Archived sites" sites={archived} emptyText="" canEdit={canEdit} />
      )}
    </div>
  )
}

function SiteList({
  title,
  sites,
  emptyText,
  canEdit,
}: {
  title: string
  sites: SiteRow[]
  emptyText: string
  canEdit: boolean
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
                {canEdit ? (
                  <Link href={`/admin/sites/${site.id}`} className="font-medium underline">
                    {site.name}
                  </Link>
                ) : (
                  <p className="font-medium">{site.name}</p>
                )}
                <p className="text-sm text-black/60">
                  {customer?.name ?? 'Unknown customer'}
                  {site.address ? ` — ${site.address}` : ''}
                </p>
                {(site.extent_of_work_filename || site.safety_plan_filename) && (
                  <p className="mt-1 flex gap-2 text-xs">
                    {site.extent_of_work_filename && (
                      <a
                        href={`/api/site-documents/${site.id}/extent-of-work`}
                        target="_blank"
                        className="rounded bg-black/5 px-2 py-0.5 underline"
                      >
                        Extent of Work
                      </a>
                    )}
                    {site.safety_plan_filename && (
                      <a
                        href={`/api/site-documents/${site.id}/safety-plan`}
                        target="_blank"
                        className="rounded bg-black/5 px-2 py-0.5 underline"
                      >
                        Safety Plan
                      </a>
                    )}
                  </p>
                )}
              </div>
              {canEdit && (
                <form action={setSiteActive.bind(null, site.id, !site.is_active)}>
                  <button type="submit" className="text-sm underline shrink-0">
                    {site.is_active ? 'Archive' : 'Restore'}
                  </button>
                </form>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
