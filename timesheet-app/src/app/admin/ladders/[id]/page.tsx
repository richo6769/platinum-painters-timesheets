import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  updateLadder,
  setLadderActive,
  deleteLadder,
  addLadderInspection,
  deleteLadderInspection,
} from '@/lib/actions/ladders'
import { requireAdminOrSupervisor } from '@/lib/authGuards'
import {
  LADDER_TYPE_LABELS,
  MATERIAL_LABELS,
  FREQUENCY_LABELS,
  STATUS_LABELS,
  STATUS_CLASSES,
  ladderStatus,
  inspectionPassed,
  formatDate,
  type LadderInspectionResult,
} from '@/lib/ladderStatus'

type Ladder = {
  id: string
  asset_number: string
  ladder_type: string
  material: string
  length_m: number | null
  rating_kg: number
  standard: string
  location: string | null
  purchase_date: string | null
  inspection_frequency: string
  is_active: boolean
}

type InspectionRow = LadderInspectionResult & {
  id: string
  notes: string | null
  profiles: { full_name: string } | { full_name: string }[] | null
}

const CHECK_FIELDS: { name: keyof LadderInspectionResult; label: string }[] = [
  { name: 'rungs_ok', label: 'Rungs' },
  { name: 'stiles_ok', label: 'Stiles' },
  { name: 'feet_ok', label: 'Feet (anti-slip, clean)' },
  { name: 'spreader_arms_ok', label: 'Spreader arms / locking hinges' },
  { name: 'safety_labels_ok', label: 'Safety labels' },
]

function inspectorName(relation: InspectionRow['profiles']): string {
  const p = Array.isArray(relation) ? relation[0] : relation
  return p?.full_name ?? 'Unknown'
}

export default async function LadderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdminOrSupervisor()

  const { id } = await params
  const supabase = await createClient()

  const [{ data: ladder }, { data: inspections }] = await Promise.all([
    supabase
      .from('ladders')
      .select(
        'id, asset_number, ladder_type, material, length_m, rating_kg, standard, location, purchase_date, inspection_frequency, is_active'
      )
      .eq('id', id)
      .single(),
    supabase
      .from('ladder_inspections')
      .select(
        'id, inspected_at, rungs_ok, stiles_ok, feet_ok, spreader_arms_ok, safety_labels_ok, notes, profiles(full_name)'
      )
      .eq('ladder_id', id)
      .order('inspected_at', { ascending: false })
      .returns<InspectionRow[]>(),
  ])

  if (!ladder) {
    notFound()
  }

  const ladderRow = ladder as Ladder
  const inspectionList = inspections ?? []
  const status = ladderStatus(inspectionList[0] ?? null, ladderRow.inspection_frequency)
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{ladderRow.asset_number}</h1>
          <p className="text-sm text-black/60">
            {LADDER_TYPE_LABELS[ladderRow.ladder_type]} · {MATERIAL_LABELS[ladderRow.material]}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[status]}`}
        >
          {STATUS_LABELS[status]}
        </span>
      </div>

      <form
        id="ladder-form"
        action={updateLadder.bind(null, ladderRow.id)}
        className="grid gap-3 rounded-lg border border-black/10 p-4 sm:grid-cols-2"
      >
        <h2 className="font-medium sm:col-span-2">Ladder details</h2>
        <div className="space-y-1">
          <label htmlFor="asset_number" className="text-sm font-medium">
            Asset / ID number
          </label>
          <input
            id="asset_number"
            name="asset_number"
            defaultValue={ladderRow.asset_number}
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
            defaultValue={ladderRow.ladder_type}
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
            defaultValue={ladderRow.material}
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
            defaultValue={ladderRow.length_m ?? ''}
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
            defaultValue={ladderRow.rating_kg}
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
            defaultValue={ladderRow.location ?? ''}
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
            defaultValue={ladderRow.purchase_date ?? ''}
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
            defaultValue={ladderRow.inspection_frequency}
            required
            className="w-full rounded-md border border-black/20 px-3 py-2"
          >
            {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-black/50 sm:col-span-2">
          Standard: {ladderRow.standard} · minimum industrial rating 120kg.
        </p>
      </form>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          form="ladder-form"
          className="rounded-md bg-black px-4 py-2 text-sm text-white"
        >
          Save changes
        </button>
        <form action={setLadderActive.bind(null, ladderRow.id, !ladderRow.is_active)}>
          <button type="submit" className="text-sm underline">
            {ladderRow.is_active ? 'Archive' : 'Restore'}
          </button>
        </form>
        {!ladderRow.is_active && (
          <form action={deleteLadder.bind(null, ladderRow.id)}>
            <button type="submit" className="text-sm text-red-600 underline">
              Delete
            </button>
          </form>
        )}
      </div>

      <form
        action={addLadderInspection.bind(null, ladderRow.id)}
        className="space-y-3 rounded-lg border border-black/10 p-4"
      >
        <h2 className="font-medium">Record an inspection</h2>
        <div className="space-y-1">
          <label htmlFor="inspected_at" className="text-sm font-medium">
            Inspection date
          </label>
          <input
            id="inspected_at"
            name="inspected_at"
            type="date"
            defaultValue={today}
            required
            className="w-full max-w-xs rounded-md border border-black/20 px-3 py-2"
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {CHECK_FIELDS.map((field) => (
            <label key={field.name} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name={field.name} defaultChecked />
              {field.label} OK
            </label>
          ))}
        </div>
        <div className="space-y-1">
          <label htmlFor="notes" className="text-sm font-medium">
            Notes (optional)
          </label>
          <input
            id="notes"
            name="notes"
            placeholder="Any defects found, action taken, etc."
            className="w-full rounded-md border border-black/20 px-3 py-2"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-black px-4 py-2 text-sm text-white"
        >
          Save inspection
        </button>
      </form>

      <div className="space-y-3">
        <h2 className="font-medium">Inspection history</h2>
        {inspectionList.length === 0 && (
          <p className="text-sm text-black/60">No inspections recorded yet.</p>
        )}
        <ul className="divide-y divide-black/10 rounded-lg border border-black/10">
          {inspectionList.map((inspection) => {
            const passed = inspectionPassed(inspection)
            const failedChecks = CHECK_FIELDS.filter((field) => !inspection[field.name])

            return (
              <li key={inspection.id} className="space-y-1 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="font-medium">{formatDate(inspection.inspected_at)}</span>{' '}
                    <span className="text-black/60">— {inspectorName(inspection.profiles)}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {passed ? 'Pass' : 'Fail'}
                    </span>
                    <form action={deleteLadderInspection.bind(null, inspection.id, ladderRow.id)}>
                      <button type="submit" className="text-red-600 underline">
                        Remove
                      </button>
                    </form>
                  </div>
                </div>
                {!passed && (
                  <p className="text-red-700">
                    Failed: {failedChecks.map((field) => field.label).join(', ')}
                  </p>
                )}
                {inspection.notes && <p className="text-black/60">{inspection.notes}</p>}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
