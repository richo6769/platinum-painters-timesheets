'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin, requireAdminOrSupervisor } from '@/lib/authGuards'

export async function createCustomer(formData: FormData) {
  await requireAdminOrSupervisor()

  const name = formData.get('name')
  const contact_person = formData.get('contact_person')

  if (typeof name !== 'string' || !name.trim()) return

  const supabase = await createClient()
  await supabase.from('customers').insert({
    name: name.trim(),
    contact_person:
      typeof contact_person === 'string' && contact_person.trim()
        ? contact_person.trim()
        : null,
  })

  revalidatePath('/admin/customers')
}

export async function updateCustomer(customerId: string, formData: FormData) {
  await requireAdmin()

  const name = formData.get('name')
  const contact_person = formData.get('contact_person')

  if (typeof name !== 'string' || !name.trim()) return

  const supabase = await createClient()
  await supabase
    .from('customers')
    .update({
      name: name.trim(),
      contact_person:
        typeof contact_person === 'string' && contact_person.trim()
          ? contact_person.trim()
          : null,
    })
    .eq('id', customerId)

  revalidatePath('/admin/customers')
  redirect('/admin/customers')
}

export async function setCustomerActive(customerId: string, isActive: boolean) {
  await requireAdmin()

  const supabase = await createClient()
  await supabase.from('customers').update({ is_active: isActive }).eq('id', customerId)

  revalidatePath('/admin/customers')
}
