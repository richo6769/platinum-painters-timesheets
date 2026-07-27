import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/supabase/profile'
import { InviteStaffForm } from './invite-form'
import { setStaffActive } from '@/lib/actions/staff'
import type { Role } from '@/lib/supabase/profile'

type StaffRow = {
  id: string
  full_name: string
  email: string
  role: Role
  is_active: boolean
}

export default async function StaffPage() {
  const profile = await getCurrentProfile()
  const canEdit = profile.role === 'admin'

  const supabase = await createClient()
  const { data: staff } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, is_active')
    .order('full_name')

  const staffList = (staff ?? []) as StaffRow[]
  const active = staffList.filter((s) => s.is_active)
  const archived = staffList.filter((s) => !s.is_active)

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Staff</h1>
        <p className="text-sm text-black/60">
          {canEdit ? 'Admin-only.' : 'You can invite new Painters below.'}
        </p>
      </div>

      <InviteStaffForm role={profile.role} />

      <StaffList
        title="Active staff"
        staffList={active}
        emptyText="No active staff."
        canEdit={canEdit}
        currentUserId={profile.id}
      />
      {archived.length > 0 && (
        <StaffList
          title="Deactivated staff"
          staffList={archived}
          emptyText=""
          canEdit={canEdit}
          currentUserId={profile.id}
        />
      )}
    </div>
  )
}

function StaffList({
  title,
  staffList,
  emptyText,
  canEdit,
  currentUserId,
}: {
  title: string
  staffList: StaffRow[]
  emptyText: string
  canEdit: boolean
  currentUserId: string
}) {
  return (
    <div className="space-y-3">
      <h2 className="font-medium">{title}</h2>
      {staffList.length === 0 && <p className="text-sm text-black/60">{emptyText}</p>}
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
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-sm text-black/60 capitalize">{person.role}</span>
              {canEdit && person.id !== currentUserId && (
                <form action={setStaffActive.bind(null, person.id, !person.is_active)}>
                  <button type="submit" className="text-sm underline">
                    {person.is_active ? 'Deactivate' : 'Restore'}
                  </button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
