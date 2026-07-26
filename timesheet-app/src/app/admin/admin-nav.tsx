'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Role } from '@/lib/supabase/profile'

const links = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/clock', label: 'Clock In/Out' },
  { href: '/admin/customers', label: 'Customers' },
  { href: '/admin/sites', label: 'Sites' },
  { href: '/admin/staff', label: 'Staff' },
  { href: '/admin/activity', label: 'Activity' },
  { href: '/admin/reports', label: 'Reports', adminOnly: true },
]

export function AdminNav({ role }: { role: Role }) {
  const pathname = usePathname()
  const visibleLinks = links.filter((link) => !link.adminOnly || role === 'admin')

  return (
    <nav className="flex gap-2 overflow-x-auto border-b border-black/10 p-3 md:w-56 md:shrink-0 md:flex-col md:overflow-visible md:border-b-0 md:border-r">
      {visibleLinks.map((link) => {
        const active =
          link.href === '/admin' ? pathname === '/admin' : pathname.startsWith(link.href)

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              active ? 'bg-red-600 text-white' : 'bg-gray-300 text-gray-800 hover:bg-gray-400'
            }`}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
