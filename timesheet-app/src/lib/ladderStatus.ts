export const LADDER_TYPE_LABELS: Record<string, string> = {
  extension: 'Extension',
  single: 'Single',
  stepladder: 'Stepladder',
}

export const MATERIAL_LABELS: Record<string, string> = {
  aluminium: 'Aluminium',
  fibreglass: 'Fibreglass',
  timber: 'Timber',
}

export const FREQUENCY_LABELS: Record<string, string> = {
  'pre-use': 'Pre-use',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  '6-monthly': '6-monthly',
  annually: 'Annually',
}

// How many days a passed inspection is considered current for, per
// frequency - drives the due-soon/overdue status pill on the register.
const FREQUENCY_DAYS: Record<string, number> = {
  'pre-use': 1,
  monthly: 30,
  quarterly: 91,
  '6-monthly': 182,
  annually: 365,
}

export type LadderInspectionResult = {
  inspected_at: string
  rungs_ok: boolean
  stiles_ok: boolean
  feet_ok: boolean
  spreader_arms_ok: boolean
  safety_labels_ok: boolean
}

export type LadderStatus = 'never-inspected' | 'failed' | 'overdue' | 'due-soon' | 'ok'

export function inspectionPassed(inspection: LadderInspectionResult): boolean {
  return (
    inspection.rungs_ok &&
    inspection.stiles_ok &&
    inspection.feet_ok &&
    inspection.spreader_arms_ok &&
    inspection.safety_labels_ok
  )
}

export function ladderStatus(
  lastInspection: LadderInspectionResult | null,
  inspectionFrequency: string
): LadderStatus {
  if (!lastInspection) return 'never-inspected'
  if (!inspectionPassed(lastInspection)) return 'failed'

  const frequencyDays = FREQUENCY_DAYS[inspectionFrequency] ?? 30
  const dueDate = new Date(`${lastInspection.inspected_at}T00:00:00`)
  dueDate.setDate(dueDate.getDate() + frequencyDays)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const daysUntilDue = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (daysUntilDue < 0) return 'overdue'
  if (daysUntilDue <= 7) return 'due-soon'
  return 'ok'
}

export const STATUS_LABELS: Record<LadderStatus, string> = {
  'never-inspected': 'Never inspected',
  failed: 'Failed inspection',
  overdue: 'Overdue',
  'due-soon': 'Due soon',
  ok: 'OK',
}

export const STATUS_CLASSES: Record<LadderStatus, string> = {
  'never-inspected': 'bg-black/10 text-black/60',
  failed: 'bg-red-100 text-red-800',
  overdue: 'bg-red-100 text-red-800',
  'due-soon': 'bg-amber-100 text-amber-800',
  ok: 'bg-green-100 text-green-800',
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-NZ')
}
