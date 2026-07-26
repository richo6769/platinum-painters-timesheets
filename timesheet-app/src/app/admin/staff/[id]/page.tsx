import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateStaff, sendPasswordReset } from '@/lib/actions/staff'
import { requireAdmin } from '@/lib/authGuards'

export default async function EditStaffPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdmin()

  const { id } = await params
  const supabase = await createClient()
  const { data: person } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('id', id)
    .single()

  if (!person) {
    notFound()
  }

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold">Edit staff</h1>
      <p className="text-sm text-black/60">{person.email}</p>

      <form action={updateStaff.bind(null, person.id)} className="space-y-3">
        <div className="space-y-1">
          <label htmlFor="full_name" className="text-sm font-medium">
            Full name
          </label>
          <input
            id="full_name"
            name="full_name"
            defaultValue={person.full_name}
            required
            className="w-full rounded-md border border-black/20 px-3 py-2"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="role" className="text-sm font-medium">
            Role
          </label>
          <select
            id="role"
            name="role"
            defaultValue={person.role}
            className="w-full rounded-md border border-black/20 px-3 py-2 sm:w-auto"
          >
            <option value="painter">Painter</option>
            <option value="supervisor">Supervisor</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-black px-4 py-2 text-sm text-white"
        >
          Save changes
        </button>
      </form>

      <form action={sendPasswordReset.bind(null, person.id)}>
        <button type="submit" className="text-sm underline">
          Send password reset email
        </button>
      </form>
    </div>
  )
}
