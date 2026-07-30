import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type Role = 'admin' | 'supervisor' | 'painter'

export type Profile = {
  id: string
  full_name: string
  role: Role
}

// cache() memoizes per request - the layout and the page both call this on
// every navigation, which was firing two separate auth+profile round trips
// to Supabase for a single page load before this was added.
export const getCurrentProfile = cache(async (): Promise<Profile> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  return profile
})
