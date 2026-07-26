'use client'

import { useActionState } from 'react'
import { inviteStaff } from '@/lib/actions/staff'
import type { Role } from '@/lib/supabase/profile'

export function InviteStaffForm({ role }: { role: Role }) {
  const [state, action, pending] = useActionState(inviteStaff, undefined)
  const canChooseRole = role === 'admin'

  return (
    <form action={action} className="space-y-3 rounded-lg border border-black/10 p-4">
      <h2 className="font-medium">Invite a staff member</h2>
      <p className="text-sm text-black/60">
        They&apos;ll get an email to set their own password.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="full_name" className="text-sm font-medium">
            Full name
          </label>
          <input
            id="full_name"
            name="full_name"
            required
            className="w-full rounded-md border border-black/20 px-3 py-2"
          />
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
            className="w-full rounded-md border border-black/20 px-3 py-2"
          />
        </div>
      </div>
      {canChooseRole ? (
        <div className="space-y-1">
          <label htmlFor="role" className="text-sm font-medium">
            Role
          </label>
          <select
            id="role"
            name="role"
            defaultValue="painter"
            className="w-full rounded-md border border-black/20 px-3 py-2 sm:w-auto"
          >
            <option value="painter">Painter</option>
            <option value="supervisor">Supervisor</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      ) : (
        <p className="text-sm text-black/60">Role: Painter</p>
      )}
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {pending ? 'Sending invite…' : 'Send invite'}
      </button>
    </form>
  )
}
