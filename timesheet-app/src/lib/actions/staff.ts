'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/lib/supabase/profile'

async function requireAdmin() {
  const profile = await getCurrentProfile()
  if (profile.role !== 'admin') {
    redirect('/clock')
  }
}

export type InviteStaffState = { error?: string } | undefined

export async function inviteStaff(
  _prevState: InviteStaffState,
  formData: FormData
): Promise<InviteStaffState> {
  await requireAdmin()

  const email = formData.get('email')
  const full_name = formData.get('full_name')
  const role = formData.get('role')

  if (typeof email !== 'string' || !email.trim()) {
    return { error: 'Email is required.' }
  }
  if (typeof full_name !== 'string' || !full_name.trim()) {
    return { error: 'Name is required.' }
  }

  const adminClient = createAdminClient()
  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email.trim(), {
    data: { full_name: full_name.trim() },
  })

  if (error) {
    return { error: error.message }
  }

  if (role === 'admin' && data.user) {
    const supabase = await createClient()
    await supabase.from('profiles').update({ role: 'admin' }).eq('id', data.user.id)
  }

  revalidatePath('/admin/staff')
  redirect('/admin/staff')
}

export async function updateStaff(staffId: string, formData: FormData) {
  await requireAdmin()

  const full_name = formData.get('full_name')
  const role = formData.get('role')

  if (typeof full_name !== 'string' || !full_name.trim()) return

  const supabase = await createClient()
  await supabase
    .from('profiles')
    .update({
      full_name: full_name.trim(),
      role: role === 'admin' ? 'admin' : 'crew',
    })
    .eq('id', staffId)

  revalidatePath('/admin/staff')
  redirect('/admin/staff')
}
