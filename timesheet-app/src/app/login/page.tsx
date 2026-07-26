'use client'

import { useActionState } from 'react'
import { login } from '@/lib/actions/auth'

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined)

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <form
        action={action}
        className="w-full max-w-sm space-y-4 rounded-lg border border-black/10 p-6"
      >
        <div>
          <h1 className="text-xl font-semibold">Sign in</h1>
          <p className="text-sm text-black/60">Painting Co. Timesheets</p>
        </div>

        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-md border border-black/20 px-3 py-2"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full rounded-md border border-black/20 px-3 py-2"
          />
        </div>

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-black px-3 py-2 text-white disabled:opacity-50"
        >
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}
