import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/supabase/profile'
import { logout } from '@/lib/actions/auth'
import { AdminNav } from './admin-nav'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getCurrentProfile()

  if (profile.role !== 'admin' && profile.role !== 'supervisor') {
    redirect('/clock')
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-black/10 bg-white px-4 py-3">
        <Link href="/admin" className="shrink-0">
          <Image src="/logo.webp" alt="Platinum Painters" width={90} height={36} priority />
        </Link>
        <div className="flex min-w-0 items-center gap-3">
          <span className="min-w-0 truncate text-sm text-black/60">
            {profile.full_name}
          </span>
          <form action={logout} className="shrink-0">
            <button className="text-sm underline">Sign out</button>
          </form>
        </div>
      </header>
      <div className="border-b border-black/10 md:hidden">
        <AdminNav role={profile.role} />
      </div>
      <div className="flex flex-1 flex-col md:flex-row">
        <div className="hidden md:block md:w-56 md:shrink-0 md:border-r md:border-black/10">
          <AdminNav role={profile.role} />
        </div>
        <main className="flex-1 p-4">{children}</main>
      </div>
    </div>
  )
}
