import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { InviteStaffForm } from './invite-form'

type StaffRow = {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'crew'
}

export default async function StaffPage() {
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
        <p className="text-sm text-black/60">Admin-only.</p>
      </div>

      <InviteStaffForm />

      <div className="space-y-3">
        <h2 className="font-medium">All staff</h2>
        <ul className="divide-y divide-black/10 rounded-lg border border-black/10">
          {staffList.map((person) => (
            <li key={person.id} className="flex items-center justify-between gap-4 p-3">
              <div>
                <Link href={`/admin/staff/${person.id}`} className="font-medium underline">
                  {person.full_name}
                </Link>
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
