import { redirect } from 'next/navigation'
import { getCurrentProfile, type Profile } from '@/lib/supabase/profile'

export async function requireAdmin(): Promise<Profile> {
  const profile = await getCurrentProfile()
  if (profile.role !== 'admin') {
    redirect('/clock')
  }
  return profile
}

export async function requireAdminOrSupervisor(): Promise<Profile> {
  const profile = await getCurrentProfile()
  if (profile.role !== 'admin' && profile.role !== 'supervisor') {
    redirect('/clock')
  }
  return profile
}
