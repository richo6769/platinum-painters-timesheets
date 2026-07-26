'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/supabase/profile'

type Coords = { lat: number | null; lng: number | null }
type ActionResult = { error?: string } | undefined

export async function clockIn(input: { siteId: string } & Coords): Promise<ActionResult> {
  const profile = await getCurrentProfile()
  const supabase = await createClient()

  const { error } = await supabase.from('timesheet_entries').insert({
    user_id: profile.id,
    site_id: input.siteId,
    clock_in_lat: input.lat,
    clock_in_lng: input.lng,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/clock')
}

export async function clockOut(
  input: {
    entryId: string
    notes: string
    breakMinutes: number
    clockOutAt: string
  } & Coords
): Promise<ActionResult> {
  const profile = await getCurrentProfile()
  const supabase = await createClient()

  const { error } = await supabase
    .from('timesheet_entries')
    .update({
      clock_out_at: input.clockOutAt,
      clock_out_lat: input.lat,
      clock_out_lng: input.lng,
      break_minutes: Math.max(0, Math.round(input.breakMinutes)),
      notes: input.notes.trim() || null,
    })
    .eq('id', input.entryId)
    .eq('user_id', profile.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/clock')
}
