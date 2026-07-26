'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/supabase/profile'

async function requireAdmin() {
  const profile = await getCurrentProfile()
  if (profile.role !== 'admin') {
    redirect('/clock')
  }
}

export async function updateEntry(entryId: string, formData: FormData) {
  await requireAdmin()

  const jobId = formData.get('job_id')
  const clockInLocal = formData.get('clock_in_at')
  const clockOutLocal = formData.get('clock_out_at')
  const notes = formData.get('notes')

  if (typeof jobId !== 'string' || !jobId) return
  if (typeof clockInLocal !== 'string' || !clockInLocal) return

  const clockIn = new Date(clockInLocal)
  const clockOut =
    typeof clockOutLocal === 'string' && clockOutLocal ? new Date(clockOutLocal) : null

  const supabase = await createClient()
  await supabase
    .from('timesheet_entries')
    .update({
      job_id: jobId,
      clock_in_at: clockIn.toISOString(),
      clock_out_at: clockOut ? clockOut.toISOString() : null,
      notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
    })
    .eq('id', entryId)

  revalidatePath('/admin/reports')
  redirect('/admin/reports')
}

export async function deleteEntry(entryId: string) {
  await requireAdmin()

  const supabase = await createClient()
  await supabase.from('timesheet_entries').delete().eq('id', entryId)

  revalidatePath('/admin/reports')
  redirect('/admin/reports')
}
