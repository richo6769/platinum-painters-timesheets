import { createElement } from 'react'
import path from 'node:path'
import { readFile } from 'node:fs/promises'
import type { ReactElement } from 'react'
import { Resend } from 'resend'
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer'
import { TimesheetReportPdf } from '@/lib/pdf/timesheet-report-pdf'
import type { ReportEntry } from '@/lib/reports'

export type SendConfirmationResult = { sent: true } | { sent: false; reason: string }

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export async function sendTimesheetConfirmationEmail(options: {
  userName: string
  from: string
  to: string
  entries: ReportEntry[]
}): Promise<SendConfirmationResult> {
  if (!process.env.RESEND_API_KEY) {
    return { sent: false, reason: 'Email sending is not configured yet.' }
  }

  const netHours = options.entries.reduce((sum, e) => sum + (e.hours ?? 0), 0)
  const breakMinutes = options.entries.reduce((sum, e) => sum + e.break_minutes, 0)

  const logoBuffer = await readFile(path.join(process.cwd(), 'public', 'logo.png'))
  const document = createElement(TimesheetReportPdf, {
    staffGroups: [
      {
        userName: options.userName,
        entries: options.entries,
        grossHours: round2(netHours + breakMinutes / 60),
        breakMinutes,
        netHours: round2(netHours),
      },
    ],
    dateRangeLabel: `${options.from} to ${options.to}`,
    logoSrc: { data: logoBuffer, format: 'png' as const },
  }) as ReactElement<DocumentProps>
  const pdfBuffer = await renderToBuffer(document)

  const resend = new Resend(process.env.RESEND_API_KEY)
  const recipient = process.env.WEEKLY_REPORT_EMAIL || 'nrichmond@platinumpainters.co.nz'

  const { error } = await resend.emails.send({
    from: 'Platinum Painters Timesheets <onboarding@resend.dev>',
    to: recipient,
    subject: `Timesheet confirmed: ${options.userName} — week ending ${options.to}`,
    text: `${options.userName} confirmed their timesheet for ${options.from} to ${options.to}.\n\nTotal hours: ${round2(netHours).toFixed(2)}`,
    attachments: [
      {
        filename: `timesheet-${options.userName.replace(/\s+/g, '-').toLowerCase()}-${options.to}.pdf`,
        content: pdfBuffer,
      },
    ],
  })

  if (error) {
    return { sent: false, reason: error.message }
  }

  return { sent: true }
}
