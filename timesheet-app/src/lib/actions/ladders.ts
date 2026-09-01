'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin, requireAdminOrSupervisor } from '@/lib/authGuards'

function optionalText(value: FormDataEntryValue | null): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export async function createLadder(formData: FormData) {
  await requireAdminOrSupervisor()

  const asset_number = formData.get('asset_number')
  const ladder_type = formData.get('ladder_type')
  const material = formData.get('material')
  const inspection_frequency = formData.get('inspection_frequency')
  const length_m = formData.get('length_m')
  const rating_kg = formData.get('rating_kg')
  const purchase_date = formData.get('purchase_date')

  if (typeof asset_number !== 'string' || !asset_number.trim()) return
  if (typeof ladder_type !== 'string') return
  if (typeof material !== 'string') return
  if (typeof inspection_frequency !== 'string') return

  const supabase = await createClient()
  await supabase.from('ladders').insert({
    asset_number: asset_number.trim(),
    ladder_type,
    material,
    inspection_frequency,
    length_m: typeof length_m === 'string' && length_m ? Number(length_m) : null,
    rating_kg: typeof rating_kg === 'string' && rating_kg ? Number(rating_kg) : 120,
    location: optionalText(formData.get('location')),
    purchase_date: typeof purchase_date === 'string' && purchase_date ? purchase_date : null,
  })

  revalidatePath('/admin/ladders')
}

export async function updateLadder(ladderId: string, formData: FormData) {
  await requireAdminOrSupervisor()

  const asset_number = formData.get('asset_number')
  const ladder_type = formData.get('ladder_type')
  const material = formData.get('material')
  const inspection_frequency = formData.get('inspection_frequency')
  const length_m = formData.get('length_m')
  const rating_kg = formData.get('rating_kg')
  const purchase_date = formData.get('purchase_date')

  if (typeof asset_number !== 'string' || !asset_number.trim()) return
  if (typeof ladder_type !== 'string') return
  if (typeof material !== 'string') return
  if (typeof inspection_frequency !== 'string') return

  const supabase = await createClient()
  await supabase
    .from('ladders')
    .update({
      asset_number: asset_number.trim(),
      ladder_type,
      material,
      inspection_frequency,
      length_m: typeof length_m === 'string' && length_m ? Number(length_m) : null,
      rating_kg: typeof rating_kg === 'string' && rating_kg ? Number(rating_kg) : 120,
      location: optionalText(formData.get('location')),
      purchase_date: typeof purchase_date === 'string' && purchase_date ? purchase_date : null,
    })
    .eq('id', ladderId)

  revalidatePath('/admin/ladders')
  revalidatePath(`/admin/ladders/${ladderId}`)
  redirect(`/admin/ladders/${ladderId}`)
}

export async function setLadderActive(ladderId: string, isActive: boolean) {
  await requireAdminOrSupervisor()

  const supabase = await createClient()
  await supabase.from('ladders').update({ is_active: isActive }).eq('id', ladderId)

  revalidatePath('/admin/ladders')
  revalidatePath(`/admin/ladders/${ladderId}`)
}

// Only offered for already-archived ladders in the UI, same pattern as
// deleteSite/deleteCustomer - keeps anyone from losing inspection history
// by accident.
export async function deleteLadder(ladderId: string) {
  await requireAdmin()

  const supabase = await createClient()
  await supabase.from('ladders').delete().eq('id', ladderId)

  revalidatePath('/admin/ladders')
  redirect('/admin/ladders')
}

export async function addLadderInspection(ladderId: string, formData: FormData) {
  const profile = await requireAdminOrSupervisor()

  const inspected_at = formData.get('inspected_at')

  const supabase = await createClient()
  await supabase.from('ladder_inspections').insert({
    ladder_id: ladderId,
    inspected_at: typeof inspected_at === 'string' && inspected_at ? inspected_at : undefined,
    inspector_id: profile.id,
    rungs_ok: formData.get('rungs_ok') === 'on',
    stiles_ok: formData.get('stiles_ok') === 'on',
    feet_ok: formData.get('feet_ok') === 'on',
    spreader_arms_ok: formData.get('spreader_arms_ok') === 'on',
    safety_labels_ok: formData.get('safety_labels_ok') === 'on',
    notes: optionalText(formData.get('notes')),
  })

  revalidatePath(`/admin/ladders/${ladderId}`)
  revalidatePath('/admin/ladders')
}

export async function deleteLadderInspection(inspectionId: string, ladderId: string) {
  await requireAdmin()

  const supabase = await createClient()
  await supabase.from('ladder_inspections').delete().eq('id', inspectionId)

  revalidatePath(`/admin/ladders/${ladderId}`)
  revalidatePath('/admin/ladders')
}
