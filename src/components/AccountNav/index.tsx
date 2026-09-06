'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/utilities/cn'

type Props = {
  className?: string
}

const items = [
  { href: '/account', label: 'Account settings' },
  { href: '/account/addresses', label: 'Addresses' },
  { href: '/orders', label: 'Orders' },
]

export const AccountNav: React.FC<Props> = ({ className }) => {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/account' ? pathname === '/account' : pathname.startsWith(href)

  return (
    <nav className={cn(className)}>
      <h2 className="mb-4 text-xs uppercase tracking-[0.14em] text-muted-foreground">Account</h2>
      <ul className="flex w-full flex-col gap-3">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={cn(
                'text-sm transition-colors',
                isActive(item.href)
                  ? 'font-medium text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>

      <div className="my-5 w-full border-t border-border" />

      <Link
        href="/logout"
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        Log out
      </Link>
    </nav>
  )
}
