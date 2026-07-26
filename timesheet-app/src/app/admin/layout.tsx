import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/supabase/profile'
import { logout } from '@/lib/actions/auth'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getCurrentProfile()

  if (profile.role !== 'admin') {
    redirect('/clock')
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-black/10 px-4 py-3">
        <nav className="flex gap-4 text-sm font-medium">
          <Link href="/admin">Dashboard</Link>
          <Link href="/admin/jobs">Jobs</Link>
          <Link href="/admin/reports">Reports</Link>
        </nav>
        <form action={logout}>
          <button className="text-sm underline">
            Sign out ({profile.full_name})
          </button>
        </form>
      </header>
      <main className="flex-1 p-4">{children}</main>
    </div>
  )
}
