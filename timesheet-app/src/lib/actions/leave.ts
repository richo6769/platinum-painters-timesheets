'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdminOrSupervisor } from '@/lib/authGuards'

export async function addLeave(formData: FormData) {
  await requireAdminOrSupervisor()

  const userId = formData.get('user_id')
  const leaveType = formData.get('leave_type')
  const startDate = formData.get('start_date')
  const endDateRaw = formData.get('end_date')
  const notes = formData.get('notes')

  if (typeof userId !== 'string' || !userId) return
  if (leaveType !== 'sick' && leaveType !== 'annual') return
  if (typeof startDate !== 'string' || !startDate) return

  const endDate = typeof endDateRaw === 'string' && endDateRaw ? endDateRaw : startDate
  if (endDate < startDate) return

  const supabase = await createClient()
  await supabase.from('staff_leave').insert({
    user_id: userId,
    leave_type: leaveType,
    start_date: startDate,
    end_date: endDate,
    notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
  })

  revalidatePath('/admin/leave')
  revalidatePath('/admin/activity')
}

export async function deleteLeave(leaveId: string) {
  await requireAdminOrSupervisor()

  const supabase = await createClient()
  await supabase.from('staff_leave').delete().eq('id', leaveId)

  revalidatePath('/admin/leave')
  revalidatePath('/admin/activity')
}
