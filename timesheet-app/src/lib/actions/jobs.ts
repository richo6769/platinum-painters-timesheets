'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/supabase/profile'

async function requireAdmin() {
  const profile = await getCurrentProfile()
  if (profile.role !== 'admin') {
    redirect('/clock')
  }
}

export async function createJob(formData: FormData) {
  await requireAdmin()

  const customer_name = formData.get('customer_name')
  const site_address = formData.get('site_address')
  const notes = formData.get('notes')

  if (typeof customer_name !== 'string' || !customer_name.trim()) return
  if (typeof site_address !== 'string' || !site_address.trim()) return

  const supabase = await createClient()
  await supabase.from('jobs').insert({
    customer_name: customer_name.trim(),
    site_address: site_address.trim(),
    notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
  })

  revalidatePath('/admin/jobs')
}

export async function updateJob(jobId: string, formData: FormData) {
  await requireAdmin()

  const customer_name = formData.get('customer_name')
  const site_address = formData.get('site_address')
  const notes = formData.get('notes')

  if (typeof customer_name !== 'string' || !customer_name.trim()) return
  if (typeof site_address !== 'string' || !site_address.trim()) return

  const supabase = await createClient()
  await supabase
    .from('jobs')
    .update({
      customer_name: customer_name.trim(),
      site_address: site_address.trim(),
      notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
    })
    .eq('id', jobId)

  revalidatePath('/admin/jobs')
  redirect('/admin/jobs')
}

export async function setJobActive(jobId: string, isActive: boolean) {
  await requireAdmin()

  const supabase = await createClient()
  await supabase.from('jobs').update({ is_active: isActive }).eq('id', jobId)

  revalidatePath('/admin/jobs')
}
