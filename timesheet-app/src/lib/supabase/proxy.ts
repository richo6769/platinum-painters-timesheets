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

  // A user can have a valid Supabase Auth session but no matching profiles
  // row (e.g. deleted profile, or any transient read failure) - getUser()
  // alone can't see that. Without this check, getCurrentProfile() below
  // would redirect such a session to /login, and this middleware would
  // immediately bounce it straight back to / (since it still sees a valid
  // user), producing an infinite redirect loop with no way out short of
  // manually clearing cookies. Signing out here breaks that loop at the
  // source: next request has no user, so it resolves to /login cleanly.
  let verifiedUser = user
  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError || !profile) {
      if (profileError) {
        console.error('proxy: profile lookup failed for', user.id, profileError.message)
      }
      await supabase.auth.signOut()
      verifiedUser = null
    }
  }

  // getUser() already made the one network round-trip to Supabase Auth that
  // verifies this request's JWT. Stamp the verified id on the request so
  // downstream Server Components (getCurrentProfile) can skip repeating that
  // same round-trip on every single navigation. Rebuilding the response to
  // pick up the new request header would drop any session-refresh cookies
  // setAll already queued above, so carry those over explicitly. Build a
  // fresh Headers instance rather than mutating request.headers in place -
  // Proxy now runs on the Node.js runtime (Next.js 16) and per Next's own
  // guidance, proxy code shouldn't rely on mutating shared/global objects.
  if (verifiedUser) {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-verified-user-id', verifiedUser.id)
    const refreshedCookies = response.cookies.getAll()
    response = NextResponse.next({ request: { headers: requestHeaders } })
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

  if (!verifiedUser && !isAlwaysPublic && !isPublicWhenLoggedOut) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    // Carry over any Set-Cookie from the signOut() above (e.g. a broken
    // profile lookup) - a bare NextResponse.redirect() here would otherwise
    // drop those and leave the stale session cookie in place, so the next
    // request would just fail the same profile check all over again.
    const redirectResponse = NextResponse.redirect(url)
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie))
    return redirectResponse
  }

  if (verifiedUser && isPublicWhenLoggedOut) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    const redirectResponse = NextResponse.redirect(url)
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie))
    return redirectResponse
  }

  return response
}
