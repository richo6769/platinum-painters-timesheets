'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, requireAdminOrSupervisor } from '@/lib/authGuards'
import { SITE_URL } from '@/lib/siteUrl'
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
  const submittedStaffTypeId = formData.get('staff_type_id')
  const staffTypeId =
    typeof submittedStaffTypeId === 'string' && submittedStaffTypeId ? submittedStaffTypeId : null

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
    redirectTo: `${SITE_URL}/reset-password`,
  })

  if (error) {
    return { error: error.message }
  }

  if ((role !== 'painter' || staffTypeId) && data.user) {
    const supabase = await createClient()
    const update: { role?: Role; staff_type_id?: string | null } = {}
    if (role !== 'painter') update.role = role
    if (staffTypeId) update.staff_type_id = staffTypeId
    await supabase.from('profiles').update(update).eq('id', data.user.id)
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
  const submittedStaffTypeId = formData.get('staff_type_id')
  const staffTypeId =
    typeof submittedStaffTypeId === 'string' && submittedStaffTypeId ? submittedStaffTypeId : null

  if (typeof full_name !== 'string' || !full_name.trim()) return

  const supabase = await createClient()
  await supabase
    .from('profiles')
    .update({
      full_name: full_name.trim(),
      role,
      staff_type_id: staffTypeId,
    })
    .eq('id', staffId)

  revalidatePath('/admin/staff')
  redirect('/admin/staff')
}

export type EmailActionState = { success?: boolean; error?: string } | undefined

export async function sendPasswordReset(
  staffId: string,
  _prevState: EmailActionState,
  _formData: FormData
): Promise<EmailActionState> {
  await requireAdmin()

  const supabase = await createClient()
  const { data: person } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', staffId)
    .single()

  if (!person) return { error: 'Staff member not found.' }

  const { error } = await supabase.auth.resetPasswordForEmail(person.email, {
    redirectTo: `${SITE_URL}/reset-password`,
  })

  if (error) return { error: error.message }
  return { success: true }
}

// A "resend" for someone who never finished setting up their account is the
// same underlying email as a password reset - it re-sends a fresh link they
// can use to set a password and sign in for the first time.
export async function resendInvite(
  staffId: string,
  _prevState: EmailActionState,
  _formData: FormData
): Promise<EmailActionState> {
  await requireAdminOrSupervisor()

  const supabase = await createClient()
  const { data: person } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', staffId)
    .single()

  if (!person) return { error: 'Staff member not found.' }

  const { error } = await supabase.auth.resetPasswordForEmail(person.email, {
    redirectTo: `${SITE_URL}/reset-password`,
  })

  if (error) return { error: error.message }
  return { success: true }
}

export async function setStaffPassword(
  staffId: string,
  _prevState: EmailActionState,
  formData: FormData
): Promise<EmailActionState> {
  await requireAdmin()

  const password = formData.get('password')
  if (typeof password !== 'string' || password.length < 8) {
    return { error: 'Password must be at least 8 characters.' }
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient.auth.admin.updateUserById(staffId, { password })

  if (error) return { error: error.message }
  return { success: true }
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

// Only for deactivated staff with zero timesheet entries - anyone who's
// actually logged hours needs to stay (deleting the auth user cascades and
// would wipe their history), which is exactly what deactivating protects.
export async function deleteStaff(staffId: string) {
  const caller = await requireAdmin()
  if (staffId === caller.id) return

  const supabase = await createClient()
  const { count } = await supabase
    .from('timesheet_entries')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', staffId)

  if ((count ?? 0) > 0) return

  const adminClient = createAdminClient()
  await adminClient.auth.admin.deleteUser(staffId)

  revalidatePath('/admin/staff')
}
