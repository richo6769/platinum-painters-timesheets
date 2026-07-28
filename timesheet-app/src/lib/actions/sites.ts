'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin, requireAdminOrSupervisor } from '@/lib/authGuards'
import {
  SITE_DOCUMENT_COLUMN,
  siteDocumentPath,
  type SiteDocumentKind,
} from '@/lib/siteDocuments'

const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

async function uploadSiteDocument(
  supabase: SupabaseServerClient,
  siteId: string,
  kind: SiteDocumentKind,
  file: File
): Promise<string | null> {
  if (file.size === 0) return null
  if (file.type !== 'application/pdf') {
    return `${kind === 'extent-of-work' ? 'Extent of Work' : 'Site Safety Plan'} must be a PDF file.`
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return `${kind === 'extent-of-work' ? 'Extent of Work' : 'Site Safety Plan'} must be under 15MB.`
  }

  const { error: uploadError } = await supabase.storage
    .from('site-documents')
    .upload(siteDocumentPath(siteId, kind), file, {
      contentType: 'application/pdf',
      upsert: true,
    })
  if (uploadError) return uploadError.message

  await supabase
    .from('sites')
    .update({ [SITE_DOCUMENT_COLUMN[kind]]: file.name })
    .eq('id', siteId)

  return null
}

export async function createSite(formData: FormData) {
  await requireAdminOrSupervisor()

  const customer_id = formData.get('customer_id')
  const name = formData.get('name')
  const address = formData.get('address')
  const contact_person = formData.get('contact_person')
  const extentOfWork = formData.get('extent_of_work')
  const safetyPlan = formData.get('safety_plan')

  if (typeof customer_id !== 'string' || !customer_id) return
  if (typeof name !== 'string' || !name.trim()) return

  const supabase = await createClient()
  const { data: site } = await supabase
    .from('sites')
    .insert({
      customer_id,
      name: name.trim(),
      address: typeof address === 'string' && address.trim() ? address.trim() : null,
      contact_person:
        typeof contact_person === 'string' && contact_person.trim()
          ? contact_person.trim()
          : null,
    })
    .select('id')
    .single()

  if (site) {
    if (extentOfWork instanceof File) {
      await uploadSiteDocument(supabase, site.id, 'extent-of-work', extentOfWork)
    }
    if (safetyPlan instanceof File) {
      await uploadSiteDocument(supabase, site.id, 'safety-plan', safetyPlan)
    }
  }

  revalidatePath('/admin/sites')
  revalidatePath('/admin/customers/[id]', 'page')
}

export async function updateSite(siteId: string, formData: FormData) {
  await requireAdmin()

  const customer_id = formData.get('customer_id')
  const name = formData.get('name')
  const address = formData.get('address')
  const contact_person = formData.get('contact_person')
  const extentOfWork = formData.get('extent_of_work')
  const safetyPlan = formData.get('safety_plan')
  const removeExtentOfWork = formData.get('remove_extent_of_work') === 'on'
  const removeSafetyPlan = formData.get('remove_safety_plan') === 'on'

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

  if (extentOfWork instanceof File && extentOfWork.size > 0) {
    await uploadSiteDocument(supabase, siteId, 'extent-of-work', extentOfWork)
  } else if (removeExtentOfWork) {
    await supabase.storage.from('site-documents').remove([siteDocumentPath(siteId, 'extent-of-work')])
    await supabase.from('sites').update({ extent_of_work_filename: null }).eq('id', siteId)
  }

  if (safetyPlan instanceof File && safetyPlan.size > 0) {
    await uploadSiteDocument(supabase, siteId, 'safety-plan', safetyPlan)
  } else if (removeSafetyPlan) {
    await supabase.storage.from('site-documents').remove([siteDocumentPath(siteId, 'safety-plan')])
    await supabase.from('sites').update({ safety_plan_filename: null }).eq('id', siteId)
  }

  revalidatePath('/admin/sites')
  redirect('/admin/sites')
}

export async function setSiteActive(siteId: string, isActive: boolean) {
  await requireAdmin()

  const supabase = await createClient()
  await supabase.from('sites').update({ is_active: isActive }).eq('id', siteId)

  revalidatePath('/admin/sites')
}
