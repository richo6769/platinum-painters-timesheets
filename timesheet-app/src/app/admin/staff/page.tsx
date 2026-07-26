import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/supabase/profile'
import { InviteStaffForm } from './invite-form'
import type { Role } from '@/lib/supabase/profile'

type StaffRow = {
  id: string
  full_name: string
  email: string
  role: Role
}

export default async function StaffPage() {
  const profile = await getCurrentProfile()
  const canEdit = profile.role === 'admin'

  const supabase = await createClient()
  const { data: staff } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .order('full_name')

  const staffList = (staff ?? []) as StaffRow[]

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Staff</h1>
        <p className="text-sm text-black/60">
          {canEdit ? 'Admin-only.' : 'You can invite new Painters below.'}
        </p>
      </div>

      <InviteStaffForm role={profile.role} />

      <div className="space-y-3">
        <h2 className="font-medium">All staff</h2>
        <ul className="divide-y divide-black/10 rounded-lg border border-black/10">
          {staffList.map((person) => (
            <li key={person.id} className="flex items-center justify-between gap-4 p-3">
              <div>
                {canEdit ? (
                  <Link href={`/admin/staff/${person.id}`} className="font-medium underline">
                    {person.full_name}
                  </Link>
                ) : (
                  <p className="font-medium">{person.full_name}</p>
                )}
                <p className="text-sm text-black/60">{person.email}</p>
              </div>
              <span className="shrink-0 text-sm text-black/60 capitalize">{person.role}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
