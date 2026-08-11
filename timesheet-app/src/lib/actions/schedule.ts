'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdminOrSupervisor } from '@/lib/authGuards'

export async function setStaffSchedule(userId: string, formData: FormData) {
  await requireAdminOrSupervisor()

  const startTime = formData.get('start_time')
  const endTime = formData.get('end_time')
  const worksSaturday = formData.get('works_saturday') === 'on'
  const worksSunday = formData.get('works_sunday') === 'on'

  if (typeof startTime !== 'string' || !startTime) return
  if (typeof endTime !== 'string' || !endTime) return

  const supabase = await createClient()
  await supabase.from('staff_schedule').upsert({
    user_id: userId,
    start_time: startTime,
    end_time: endTime,
    works_saturday: worksSaturday,
    works_sunday: worksSunday,
    updated_at: new Date().toISOString(),
  })

  revalidatePath('/admin/leave')
}
