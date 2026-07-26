import { createElement } from 'react'
import path from 'node:path'
import { readFile } from 'node:fs/promises'
import type { ReactElement } from 'react'
import { Resend } from 'resend'
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer'
import { createAdminClient } from '@/lib/supabase/admin'
import { groupByStaff } from '@/lib/reportGroups'
import { TimesheetReportPdf } from '@/lib/pdf/timesheet-report-pdf'

function nzDateString(date: Date): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland' }).format(date)
}

// The most recently completed Monday-Sunday week, in NZ time.
export function getPreviousWeekRange(now: Date = new Date()): { from: string; to: string } {
  const today = new Date(`${nzDateString(now)}T00:00:00Z`)
  const dayOfWeek = today.getUTCDay() // 0 = Sunday .. 6 = Saturday

  const lastSunday = new Date(today)
  lastSunday.setUTCDate(today.getUTCDate() - dayOfWeek)

  const lastMonday = new Date(lastSunday)
  lastMonday.setUTCDate(lastSunday.getUTCDate() - 6)

  const toDateStr = (d: Date) => d.toISOString().slice(0, 10)
  return { from: toDateStr(lastMonday), to: toDateStr(lastSunday) }
}

export async function isWeeklyReportEnabled(): Promise<boolean> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('app_settings')
    .select('weekly_report_enabled')
    .eq('id', true)
    .single()

  return data?.weekly_report_enabled ?? false
}

export type SendWeeklyReportResult = { sent: true } | { sent: false; reason: string }

export async function sendWeeklyReportEmail(options?: {
  force?: boolean
}): Promise<SendWeeklyReportResult> {
  const enabled = await isWeeklyReportEnabled()
  if (!enabled && !options?.force) {
    return { sent: false, reason: 'Weekly report is turned off.' }
  }

  if (!process.env.RESEND_API_KEY) {
    return { sent: false, reason: 'RESEND_API_KEY is not configured.' }
  }

  const supabase = createAdminClient()
  const { from, to } = getPreviousWeekRange()
  const staffGroups = await groupByStaff({ from, to }, supabase)

  const logoBuffer = await readFile(path.join(process.cwd(), 'public', 'logo.png'))
  const document = createElement(TimesheetReportPdf, {
    staffGroups,
    dateRangeLabel: `${from} to ${to}`,
    logoSrc: { data: logoBuffer, format: 'png' as const },
  }) as ReactElement<DocumentProps>
  const pdfBuffer = await renderToBuffer(document)

  const resend = new Resend(process.env.RESEND_API_KEY)
  const recipient = process.env.WEEKLY_REPORT_EMAIL || 'nrichmond@platinumpainters.co.nz'

  const { error } = await resend.emails.send({
    from: 'Platinum Painters Timesheets <onboarding@resend.dev>',
    to: recipient,
    subject: `Weekly timesheet report: ${from} to ${to}`,
    text: `Attached is the timesheet report for ${from} to ${to}.`,
    attachments: [
      {
        filename: `timesheet-report-${from}-to-${to}.pdf`,
        content: pdfBuffer,
      },
    ],
  })

  if (error) {
    return { sent: false, reason: error.message }
  }

  return { sent: true }
}
