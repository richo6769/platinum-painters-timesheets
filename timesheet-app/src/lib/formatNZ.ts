const TIME_ZONE = 'Pacific/Auckland'

// The server runs in UTC - without an explicit timeZone, a stored UTC
// timestamp displays as the UTC clock time instead of NZ time, which is off
// by 12-13 hours (wrong date, and often AM/PM flipped).
export function formatNZDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-NZ', {
    timeZone: TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

// For contexts (like the PDF) that want a month name instead of dd/mm/yyyy.
export function formatNZDateTimeLong(iso: string): string {
  return new Date(iso).toLocaleString('en-NZ', {
    timeZone: TIME_ZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

// Excel/ExcelJS date cells are timezone-naive - a numFmt just prints
// whatever Y/M/D/H/M/S the underlying value has, read via UTC getters. To
// make it print the NZ wall-clock time, build a Date whose UTC components
// *are* that NZ wall-clock time, rather than passing the real UTC instant.
export function toNZExcelDate(iso: string): Date {
  const parts = new Intl.DateTimeFormat('en-NZ', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso))

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0)

  return new Date(
    Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  )
}
