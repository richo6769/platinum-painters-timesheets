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

  // getUser() already made the one network round-trip to Supabase Auth that
  // verifies this request's JWT. Stamp the verified id on the request so
  // downstream Server Components (getCurrentProfile) can skip repeating that
  // same round-trip on every single navigation. Rebuilding the response to
  // pick up the new request header would drop any session-refresh cookies
  // setAll already queued above, so carry those over explicitly.
  if (user) {
    request.headers.set('x-verified-user-id', user.id)
    const refreshedCookies = response.cookies.getAll()
    response = NextResponse.next({ request })
    refreshedCookies.forEach((cookie) => response.cookies.set(cookie))
  }

  const path = request.nextUrl.pathname
  // /reset-password is reachable regardless of session state: the recovery
  // link's token is only exchanged for a session client-side (via the URL
  // hash), which this server-side check can't see yet on first load - and
  // an existing session shouldn't bounce someone away from it either.
  // /accept-invite is the same story, one step earlier - it hasn't
  // exchanged anything yet, it's the page that does that on a real click.
  const isAlwaysPublic = path === '/reset-password' || path === '/accept-invite'
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
