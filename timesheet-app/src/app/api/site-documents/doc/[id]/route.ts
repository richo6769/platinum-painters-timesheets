import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/supabase/profile'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await getCurrentProfile()
  const { id } = await params

  const supabase = await createClient()
  const { data: doc } = await supabase
    .from('site_documents')
    .select('storage_path, sites(is_active)')
    .eq('id', id)
    .single<{ storage_path: string; sites: { is_active: boolean } | { is_active: boolean }[] | null }>()

  if (!doc) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const site = Array.isArray(doc.sites) ? doc.sites[0] : doc.sites
  if (profile.role === 'painter' && site && !site.is_active) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: signed, error } = await supabase.storage
    .from('site-documents')
    .createSignedUrl(doc.storage_path, 60)

  if (error || !signed) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.redirect(signed.signedUrl)
}
