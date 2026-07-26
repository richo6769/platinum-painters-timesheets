'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin, requireAdminOrSupervisor } from '@/lib/authGuards'

export async function createSite(formData: FormData) {
  await requireAdminOrSupervisor()

  const customer_id = formData.get('customer_id')
  const name = formData.get('name')
  const address = formData.get('address')
  const contact_person = formData.get('contact_person')

  if (typeof customer_id !== 'string' || !customer_id) return
  if (typeof name !== 'string' || !name.trim()) return

  const supabase = await createClient()
  await supabase.from('sites').insert({
    customer_id,
    name: name.trim(),
    address: typeof address === 'string' && address.trim() ? address.trim() : null,
    contact_person:
      typeof contact_person === 'string' && contact_person.trim()
        ? contact_person.trim()
        : null,
  })

  revalidatePath('/admin/sites')
}

export async function updateSite(siteId: string, formData: FormData) {
  await requireAdmin()

  const customer_id = formData.get('customer_id')
  const name = formData.get('name')
  const address = formData.get('address')
  const contact_person = formData.get('contact_person')

  if (typeof customer_id !== 'string' || !customer_id) return
  if (typeof name !== 'string' || !name.trim()) return

  const supabase = await createClient()
  await supabase
    .from('sites')
    .update({
      customer_id,
      name: name.trim(),
      address: typeof address === 'string' && address.trim() ? address.trim() : null,
      contact_person:
        typeof contact_person === 'string' && contact_person.trim()
          ? contact_person.trim()
          : null,
    })
    .eq('id', siteId)

  revalidatePath('/admin/sites')
  redirect('/admin/sites')
}

export async function setSiteActive(siteId: string, isActive: boolean) {
  await requireAdmin()

  const supabase = await createClient()
  await supabase.from('sites').update({ is_active: isActive }).eq('id', siteId)

  revalidatePath('/admin/sites')
}
