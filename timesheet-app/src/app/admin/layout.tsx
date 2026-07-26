import Image from 'next/image'
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
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 px-4 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/admin" className="shrink-0">
            <Image src="/logo.webp" alt="Platinum Painters" width={90} height={36} priority />
          </Link>
          <nav className="flex flex-wrap gap-4 text-sm font-medium">
            <Link href="/admin">Dashboard</Link>
            <Link href="/clock">Clock In/Out</Link>
            <Link href="/admin/customers">Customers</Link>
            <Link href="/admin/sites">Sites</Link>
            <Link href="/admin/staff">Staff</Link>
            <Link href="/admin/activity">Activity</Link>
            <Link href="/admin/reports">Reports</Link>
          </nav>
        </div>
        <div className="flex min-w-0 items-center gap-3">
          <span className="min-w-0 truncate text-sm text-black/60">
            {profile.full_name}
          </span>
          <form action={logout} className="shrink-0">
            <button className="text-sm underline">Sign out</button>
          </form>
        </div>
      </header>
      <main className="flex-1 p-4">{children}</main>
    </div>
  )
}
