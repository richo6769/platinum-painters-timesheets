'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, requireAdminOrSupervisor } from '@/lib/authGuards'
import type { Role } from '@/lib/supabase/profile'

const VALID_ROLES: Role[] = ['admin', 'supervisor', 'painter']

export type InviteStaffState = { error?: string } | undefined

export async function inviteStaff(
  _prevState: InviteStaffState,
  formData: FormData
): Promise<InviteStaffState> {
  const caller = await requireAdminOrSupervisor()

  const email = formData.get('email')
  const full_name = formData.get('full_name')
  const submittedRole = formData.get('role')

  if (typeof email !== 'string' || !email.trim()) {
    return { error: 'Email is required.' }
  }
  if (typeof full_name !== 'string' || !full_name.trim()) {
    return { error: 'Name is required.' }
  }

  // Supervisors can only ever create Painter accounts, regardless of what
  // the form submits.
  const role: Role =
    caller.role === 'supervisor'
      ? 'painter'
      : VALID_ROLES.includes(submittedRole as Role)
        ? (submittedRole as Role)
        : 'painter'

  const adminClient = createAdminClient()
  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email.trim(), {
    data: { full_name: full_name.trim() },
  })

  if (error) {
    return { error: error.message }
  }

  if (role !== 'painter' && data.user) {
    const supabase = await createClient()
    await supabase.from('profiles').update({ role }).eq('id', data.user.id)
  }

  revalidatePath('/admin/staff')
  redirect('/admin/staff')
}

export async function updateStaff(staffId: string, formData: FormData) {
  await requireAdmin()

  const full_name = formData.get('full_name')
  const submittedRole = formData.get('role')
  const role: Role = VALID_ROLES.includes(submittedRole as Role)
    ? (submittedRole as Role)
    : 'painter'

  if (typeof full_name !== 'string' || !full_name.trim()) return

  const supabase = await createClient()
  await supabase
    .from('profiles')
    .update({
      full_name: full_name.trim(),
      role,
    })
    .eq('id', staffId)

  revalidatePath('/admin/staff')
  redirect('/admin/staff')
}

export async function sendPasswordReset(staffId: string) {
  await requireAdmin()

  const supabase = await createClient()
  const { data: person } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', staffId)
    .single()

  if (!person) return

  await supabase.auth.resetPasswordForEmail(person.email)
}

// Deactivating (rather than deleting) keeps the person's past timesheet
// entries intact for historical reports - a hard delete would cascade and
// wipe them. The Supabase Auth ban is what actually blocks their login;
// is_active just drives what the staff list shows.
export async function setStaffActive(staffId: string, isActive: boolean) {
  const caller = await requireAdmin()
  if (staffId === caller.id) return

  const supabase = await createClient()
  await supabase.from('profiles').update({ is_active: isActive }).eq('id', staffId)

  const adminClient = createAdminClient()
  await adminClient.auth.admin.updateUserById(staffId, {
    ban_duration: isActive ? 'none' : '876000h',
  })

  revalidatePath('/admin/staff')
}
