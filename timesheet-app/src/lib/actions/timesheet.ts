'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/supabase/profile'
import { requireAdmin } from '@/lib/authGuards'

type Coords = { lat: number | null; lng: number | null }
type ActionResult = { error?: string } | undefined

export async function clockIn(
  input: {
    siteId: string
    safetyAcknowledged?: boolean
    deviceId?: string
    deviceLabel?: string
  } & Coords
): Promise<ActionResult> {
  const profile = await getCurrentProfile()
  const supabase = await createClient()

  const { data: site } = await supabase
    .from('sites')
    .select('safety_plan_filename')
    .eq('id', input.siteId)
    .single()

  if (site?.safety_plan_filename) {
    const { data: ack } = await supabase
      .from('site_safety_acknowledgements')
      .select('id')
      .eq('user_id', profile.id)
      .eq('site_id', input.siteId)
      .maybeSingle()

    if (!ack) {
      if (!input.safetyAcknowledged) {
        return { error: 'Please confirm you have read the Site Safety Plan before clocking in.' }
      }
      const { error: ackError } = await supabase.from('site_safety_acknowledgements').insert({
        user_id: profile.id,
        site_id: input.siteId,
      })
      if (ackError) {
        return { error: ackError.message }
      }
    }
  }

  const { error } = await supabase.from('timesheet_entries').insert({
    user_id: profile.id,
    site_id: input.siteId,
    clock_in_lat: input.lat,
    clock_in_lng: input.lng,
    clock_in_device_id: input.deviceId ?? null,
    clock_in_device_label: input.deviceLabel ?? null,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/clock')
}

// Admin-initiated clock in/out on behalf of a staff member who forgot -
// no GPS (the admin isn't on site) and no safety-plan gate (that's a
// self-confirmation only the person themselves can make).
export async function adminClockIn(userId: string, siteId: string): Promise<ActionResult> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase.from('timesheet_entries').insert({
    user_id: userId,
    site_id: siteId,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/activity')
}

export async function adminClockOut(entryId: string): Promise<ActionResult> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('timesheet_entries')
    .update({ clock_out_at: new Date().toISOString() })
    .eq('id', entryId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/activity')
}

export async function clockOut(
  input: {
    entryId: string
    notes: string
    breakMinutes: number
    clockOutAt: string
    deviceId?: string
    deviceLabel?: string
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
      clock_out_device_id: input.deviceId ?? null,
      clock_out_device_label: input.deviceLabel ?? null,
    })
    .eq('id', input.entryId)
    .eq('user_id', profile.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/clock')
}
