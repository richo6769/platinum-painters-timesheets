import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/supabase/profile'
import { SITE_DOCUMENT_COLUMN, isSiteDocumentKind, siteDocumentPath } from '@/lib/siteDocuments'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ siteId: string; kind: string }> }
) {
  const profile = await getCurrentProfile()
  const { siteId, kind } = await params

  if (!isSiteDocumentKind(kind)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const column = SITE_DOCUMENT_COLUMN[kind]

  const supabase = await createClient()
  const { data: site } = await supabase
    .from('sites')
    .select(`is_active, ${column}`)
    .eq('id', siteId)
    .single<{ is_active: boolean } & Record<typeof column, string | null>>()

  if (!site || !site[column]) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (profile.role === 'painter' && !site.is_active) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: signed, error } = await supabase.storage
    .from('site-documents')
    .createSignedUrl(siteDocumentPath(siteId, kind), 60)

  if (error || !signed) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.redirect(signed.signedUrl)
}
