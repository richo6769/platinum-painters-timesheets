'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/clock', label: 'Clock In/Out' },
  { href: '/admin/customers', label: 'Customers' },
  { href: '/admin/sites', label: 'Sites' },
  { href: '/admin/staff', label: 'Staff' },
  { href: '/admin/activity', label: 'Activity' },
  { href: '/admin/reports', label: 'Reports' },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="flex gap-2 overflow-x-auto border-b border-black/10 p-3 md:w-56 md:shrink-0 md:flex-col md:overflow-visible md:border-b-0 md:border-r">
      {links.map((link) => {
        const active =
          link.href === '/admin' ? pathname === '/admin' : pathname.startsWith(link.href)

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              active ? 'bg-red-600 text-white' : 'bg-red-50 text-red-900 hover:bg-red-100'
            }`}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
