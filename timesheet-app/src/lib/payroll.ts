import type { ReportEntry } from '@/lib/reports'

// Payroll is only ever paid in half-hour blocks. Punches are rounded in the
// business's favour: a clock-in rounds forward to the next half hour, a
// clock-out rounds back to the previous half hour. This never touches the
// raw punch stored in the database - it's only applied when calculating
// hours for pay.
const HALF_HOUR_MS = 30 * 60 * 1000

export function roundClockInForPay(iso: string): number {
  return Math.ceil(new Date(iso).getTime() / HALF_HOUR_MS) * HALF_HOUR_MS
}

export function roundClockOutForPay(iso: string): number {
  return Math.floor(new Date(iso).getTime() / HALF_HOUR_MS) * HALF_HOUR_MS
}

export function payHoursForEntry(entry: {
  clock_in_at: string
  clock_out_at: string | null
  break_minutes: number
}): number | null {
  if (!entry.clock_out_at) return null

  const start = roundClockInForPay(entry.clock_in_at)
  const end = roundClockOutForPay(entry.clock_out_at)
  const hours = (end - start) / 3600000 - entry.break_minutes / 60

  return Math.max(0, Math.round(hours * 100) / 100)
}

// For display on a payroll-facing report: punches shown rounded to the
// payable half hour, and the hours total to match. Leaves an open shift
// (no clock-out yet) untouched.
export function applyPayRounding(entry: ReportEntry): ReportEntry {
  if (!entry.clock_out_at) return entry

  return {
    ...entry,
    clock_in_at: new Date(roundClockInForPay(entry.clock_in_at)).toISOString(),
    clock_out_at: new Date(roundClockOutForPay(entry.clock_out_at)).toISOString(),
    hours: payHoursForEntry(entry),
  }
}
