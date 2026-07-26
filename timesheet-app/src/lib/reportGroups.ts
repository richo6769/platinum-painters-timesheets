import { createClient } from '@/lib/supabase/server'
import { getReportEntries, type ReportEntry, type ReportFilters } from '@/lib/reports'

type SupabaseClientLike = Awaited<ReturnType<typeof createClient>>

export type GroupTotals = {
  grossHours: number
  breakMinutes: number
  netHours: number
}

export type StaffGroup = GroupTotals & {
  userName: string
  entries: ReportEntry[]
}

export type SiteGroup = GroupTotals & {
  siteName: string
  staffGroups: StaffGroup[]
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function totalsFor(entries: ReportEntry[]): GroupTotals {
  const completed = entries.filter((e) => e.hours !== null)
  const netHours = completed.reduce((sum, e) => sum + (e.hours ?? 0), 0)
  const breakMinutes = completed.reduce((sum, e) => sum + e.break_minutes, 0)
  return {
    grossHours: round2(netHours + breakMinutes / 60),
    breakMinutes,
    netHours: round2(netHours),
  }
}

function groupStaffEntries(entries: ReportEntry[]): StaffGroup[] {
  const byUser = new Map<string, ReportEntry[]>()
  for (const entry of entries) {
    if (entry.hours === null) continue
    const list = byUser.get(entry.user_name) ?? []
    list.push(entry)
    byUser.set(entry.user_name, list)
  }

  return Array.from(byUser.entries())
    .map(([userName, userEntries]) => ({
      userName,
      entries: userEntries,
      ...totalsFor(userEntries),
    }))
    .sort((a, b) => a.userName.localeCompare(b.userName))
}

export async function groupByStaff(
  filters: ReportFilters,
  client?: SupabaseClientLike
): Promise<StaffGroup[]> {
  const entries = await getReportEntries(filters, client)
  return groupStaffEntries(entries)
}

export async function groupBySite(
  filters: ReportFilters,
  client?: SupabaseClientLike
): Promise<SiteGroup[]> {
  const entries = await getReportEntries(filters, client)

  const bySite = new Map<string, ReportEntry[]>()
  for (const entry of entries) {
    if (entry.hours === null) continue
    const list = bySite.get(entry.site_name) ?? []
    list.push(entry)
    bySite.set(entry.site_name, list)
  }

  return Array.from(bySite.entries())
    .map(([siteName, siteEntries]) => ({
      siteName,
      staffGroups: groupStaffEntries(siteEntries),
      ...totalsFor(siteEntries),
    }))
    .sort((a, b) => a.siteName.localeCompare(b.siteName))
}
