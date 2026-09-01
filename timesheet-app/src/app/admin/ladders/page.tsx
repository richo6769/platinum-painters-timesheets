import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createLadder } from '@/lib/actions/ladders'
import { requireAdminOrSupervisor } from '@/lib/authGuards'
import {
  LADDER_TYPE_LABELS,
  MATERIAL_LABELS,
  FREQUENCY_LABELS,
  STATUS_LABELS,
  STATUS_CLASSES,
  ladderStatus,
  formatDate,
  type LadderInspectionResult,
} from '@/lib/ladderStatus'

type Ladder = {
  id: string
  asset_number: string
  ladder_type: string
  material: string
  length_m: number | null
  location: string | null
  inspection_frequency: string
  is_active: boolean
}

type InspectionRow = LadderInspectionResult & { id: string; ladder_id: string }

export default async function LaddersPage() {
  await requireAdminOrSupervisor()

  const supabase = await createClient()
  const [{ data: ladders }, { data: inspections }] = await Promise.all([
    supabase
      .from('ladders')
      .select(
        'id, asset_number, ladder_type, material, length_m, location, inspection_frequency, is_active'
      )
      .order('is_active', { ascending: false })
      .order('asset_number', { ascending: true }),
    supabase
      .from('ladder_inspections')
      .select('id, ladder_id, inspected_at, rungs_ok, stiles_ok, feet_ok, spreader_arms_ok, safety_labels_ok')
      .order('inspected_at', { ascending: false })
      .returns<InspectionRow[]>(),
  ])

  const lastInspectionByLadder = new Map<string, InspectionRow>()
  for (const inspection of inspections ?? []) {
    if (!lastInspectionByLadder.has(inspection.ladder_id)) {
      lastInspectionByLadder.set(inspection.ladder_id, inspection)
    }
  }

  const ladderList = (ladders ?? []) as Ladder[]
  const active = ladderList.filter((l) => l.is_active)
  const archived = ladderList.filter((l) => !l.is_active)

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Ladder Register</h1>
        <p className="text-sm text-black/60">
          Every ladder we own, its details, and inspection status against AS/NZS 1892.
        </p>
      </div>

      <form
        action={createLadder}
        className="grid gap-3 rounded-lg border border-black/10 p-4 sm:grid-cols-2"
      >
        <h2 className="font-medium sm:col-span-2">Add a ladder</h2>
        <div className="space-y-1">
          <label htmlFor="asset_number" className="text-sm font-medium">
            Asset / ID number
          </label>
          <input
            id="asset_number"
            name="asset_number"
            required
            className="w-full rounded-md border border-black/20 px-3 py-2"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="ladder_type" className="text-sm font-medium">
            Type
          </label>
          <select
            id="ladder_type"
            name="ladder_type"
            required
            className="w-full rounded-md border border-black/20 px-3 py-2"
          >
            {Object.entries(LADDER_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="material" className="text-sm font-medium">
            Material
          </label>
          <select
            id="material"
            name="material"
            required
            className="w-full rounded-md border border-black/20 px-3 py-2"
          >
            {Object.entries(MATERIAL_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="length_m" className="text-sm font-medium">
            Length / height (m)
          </label>
          <input
            id="length_m"
            name="length_m"
            type="number"
            step="0.1"
            min="0"
            className="w-full rounded-md border border-black/20 px-3 py-2"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="rating_kg" className="text-sm font-medium">
            Rating (kg)
          </label>
          <input
            id="rating_kg"
            name="rating_kg"
            type="number"
            min="0"
            defaultValue={120}
            className="w-full rounded-md border border-black/20 px-3 py-2"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="location" className="text-sm font-medium">
            Location (optional)
          </label>
          <input
            id="location"
            name="location"
            placeholder="e.g. Van 3 / Workshop"
            className="w-full rounded-md border border-black/20 px-3 py-2"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="purchase_date" className="text-sm font-medium">
            Purchase / service date (optional)
          </label>
          <input
            id="purchase_date"
            name="purchase_date"
            type="date"
            className="w-full rounded-md border border-black/20 px-3 py-2"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="inspection_frequency" className="text-sm font-medium">
            Inspection frequency
          </label>
          <select
            id="inspection_frequency"
            name="inspection_frequency"
            required
            defaultValue="monthly"
            className="w-full rounded-md border border-black/20 px-3 py-2"
          >
            {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-black px-4 py-2 text-sm text-white sm:col-span-2 sm:w-fit"
        >
          Add ladder
        </button>
      </form>

      <LadderList
        title="Active ladders"
        ladders={active}
        lastInspectionByLadder={lastInspectionByLadder}
        emptyText="No ladders registered yet."
      />
      {archived.length > 0 && (
        <LadderList
          title="Archived ladders"
          ladders={archived}
          lastInspectionByLadder={lastInspectionByLadder}
          emptyText=""
        />
      )}
    </div>
  )
}

function LadderList({
  title,
  ladders,
  lastInspectionByLadder,
  emptyText,
}: {
  title: string
  ladders: Ladder[]
  lastInspectionByLadder: Map<string, InspectionRow>
  emptyText: string
}) {
  return (
    <div className="space-y-3">
      <h2 className="font-medium">{title}</h2>
      {ladders.length === 0 && <p className="text-sm text-black/60">{emptyText}</p>}
      <ul className="divide-y divide-black/10 rounded-lg border border-black/10">
        {ladders.map((ladder) => {
          const lastInspection = lastInspectionByLadder.get(ladder.id) ?? null
          const status = ladderStatus(lastInspection, ladder.inspection_frequency)

          return (
            <li key={ladder.id} className="p-3">
              <Link
                href={`/admin/ladders/${ladder.id}`}
                className="flex items-center justify-between gap-4"
              >
                <div>
                  <p className="font-medium">
                    {ladder.asset_number} — {LADDER_TYPE_LABELS[ladder.ladder_type]} (
                    {MATERIAL_LABELS[ladder.material]})
                  </p>
                  <p className="text-sm text-black/60">
                    {ladder.location ?? 'No location set'}
                    {ladder.length_m ? ` · ${ladder.length_m}m` : ''}
                    {lastInspection
                      ? ` · Last inspected ${formatDate(lastInspection.inspected_at)}`
                      : ''}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[status]}`}
                >
                  {STATUS_LABELS[status]}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
