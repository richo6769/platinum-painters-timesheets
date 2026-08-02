import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/supabase/profile'

export default async function Home() {
  const profile = await getCurrentProfile()
  redirect(profile.role === 'admin' || profile.role === 'supervisor' ? '/admin' : '/clock')
}
