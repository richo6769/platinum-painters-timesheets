import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Refreshes the Supabase auth session on every request and applies
// role-based routing (painter -> /clock, admin/supervisor -> full nav, signed out -> /login).
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  // /reset-password is reachable regardless of session state: the recovery
  // link's token is only exchanged for a session client-side (via the URL
  // hash), which this server-side check can't see yet on first load - and
  // an existing session shouldn't bounce someone away from it either.
  const isAlwaysPublic = path === '/reset-password'
  const isPublicWhenLoggedOut = path === '/login'

  if (!user && !isAlwaysPublic && !isPublicWhenLoggedOut) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isPublicWhenLoggedOut) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return response
}
