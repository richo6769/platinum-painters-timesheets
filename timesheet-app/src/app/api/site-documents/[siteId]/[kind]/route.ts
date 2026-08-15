import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/supabase/profile'
import {
  SITE_DOCUMENT_COLUMN,
  SITE_DOCUMENT_LABELS,
  isSiteDocumentKind,
  siteDocumentPath,
} from '@/lib/siteDocuments'

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

  const path = siteDocumentPath(siteId, kind)

  // Only admins get a directly downloadable link - everyone else gets the
  // file streamed back inline, with no saveable URL to share or copy.
  if (profile.role === 'admin') {
    const { data: signed, error } = await supabase.storage
      .from('site-documents')
      .createSignedUrl(path, 60)

    if (error || !signed) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.redirect(signed.signedUrl)
  }

  const { data: file, error } = await supabase.storage.from('site-documents').download(path)

  if (error || !file) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return new NextResponse(file, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${SITE_DOCUMENT_LABELS[kind]}.pdf"`,
      'Cache-Control': 'no-store',
    },
  })
}
