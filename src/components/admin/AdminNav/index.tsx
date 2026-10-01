'use client'

import { useAuth, useNav } from '@payloadcms/ui'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import React, { useEffect, useRef, useState } from 'react'

import type { User } from '@/payload-types'

import './index.scss'

type IconProps = { className?: string }

const Icon = ({ children, className }: React.PropsWithChildren<IconProps>) => (
  <svg
    aria-hidden="true"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
  >
    {children}
  </svg>
)

const HomeIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m4 10 8-6.5 8 6.5v9.5H4Z" />
    <path d="M9 19.5v-6h6v6" />
  </Icon>
)

const OrdersIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect height="15" rx="2" width="16" x="4" y="5" />
    <path d="M8 5V3.5M16 5V3.5M8 10h8M8 14h5" />
  </Icon>
)

const ProductsIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3.8 12.2 11.3 4h7.2l1.7 1.7v7.2l-8.1 7.4a2 2 0 0 1-2.8 0l-5.5-5.4a2 2 0 0 1 0-2.7Z" />
    <circle cx="15.7" cy="8.5" r="1.2" />
  </Icon>
)

const CustomersIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3.8 19c.3-4 2.1-6 5.2-6s4.9 2 5.2 6M15 6.2a3 3 0 0 1 0 5.6M16 13.2c2.7.6 4 2.5 4.2 5.8" />
  </Icon>
)

const InventoryIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m4 8 8-4 8 4-8 4Z" />
    <path d="M4 8v8l8 4 8-4V8M12 12v8" />
  </Icon>
)

const MarketingIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m4 13 11-5v8L4 11Z" />
    <path d="M15 10.2c2.4 0 4.2-1.4 5-3.2v10c-.8-1.8-2.6-3.2-5-3.2M6.5 13.5l1 5h3l-1.4-6.3" />
  </Icon>
)

const AnalyticsIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M5 20v-6M10 20V9M15 20V4M20 20v-9" />
  </Icon>
)

const ContentIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect height="16" rx="2" width="16" x="4" y="4" />
    <circle cx="9" cy="9" r="1.5" />
    <path d="m6.5 17 4-4 2.8 2.5 2-2 2.2 3.5" />
  </Icon>
)

const SettingsIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="m9.4 3.8.5 1.8a7 7 0 0 1 4.2 0l.5-1.8 2.8 1.6-1.3 1.4a7 7 0 0 1 2.1 3.6l1.8.4V14l-1.8.4a7 7 0 0 1-2.1 3.6l1.3 1.4-2.8 1.6-.5-1.8a7 7 0 0 1-4.2 0L9.4 21l-2.8-1.6L7.9 18a7 7 0 0 1-2.1-3.6L4 14v-3.2l1.8-.4a7 7 0 0 1 2.1-3.6L6.6 5.4Z" />
  </Icon>
)

const SearchIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="10.8" cy="10.8" r="6.2" />
    <path d="m15.4 15.4 4.4 4.4" />
  </Icon>
)

const ChevronIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m9 6 6 6-6 6" />
  </Icon>
)

const mainLinks = [
  { Icon: HomeIcon, href: '/admin', label: 'Dashboard', match: 'dashboard' },
  { Icon: OrdersIcon, href: '/admin/collections/orders', label: 'Orders', match: 'orders' },
  { Icon: ProductsIcon, href: '/admin/collections/products', label: 'Products', match: 'products' },
  { Icon: CustomersIcon, href: '/admin/collections/users', label: 'Customers', match: 'customers' },
  {
    Icon: InventoryIcon,
    href: '/admin/collections/products?limit=10&where[inventory][less_than_equal]=25',
    label: 'Inventory',
    match: 'inventory',
  },
  { Icon: MarketingIcon, href: '/admin/collections/forms', label: 'Marketing', match: 'marketing' },
  {
    Icon: AnalyticsIcon,
    href: '/admin?range=30d&compare=previous&section=analytics#analytics',
    label: 'Analytics',
    match: 'analytics',
  },
  { Icon: ContentIcon, href: '/admin/collections/pages', label: 'Content', match: 'content' },
] as const

const initialsFor = (name?: null | string, email?: null | string) => {
  const source = name?.trim() || email?.split('@')[0] || 'Admin'
  const parts = source.split(/\s+/).filter(Boolean)
  return (parts.length > 1 ? `${parts[0][0]}${parts.at(-1)?.[0]}` : source.slice(0, 2)).toUpperCase()
}

export const AdminNav: React.FC = () => {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth<User>()
  const { navOpen, navRef, setNavOpen } = useNav()
  const [orderCount, setOrderCount] = useState<number | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const section = searchParams.get('section')
  const hasInventoryFilter = searchParams.toString().includes('inventory')

  useEffect(() => {
    const controller = new AbortController()

    void fetch('/api/orders?limit=1&depth=0&where[status][equals]=processing', {
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (typeof data?.totalDocs === 'number') setOrderCount(data.totalDocs)
      })
      .catch(() => undefined)

    return () => controller.abort()
  }, [])

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  const isActive = (match: (typeof mainLinks)[number]['match']) => {
    if (match === 'dashboard') return pathname === '/admin' && section !== 'analytics'
    if (match === 'analytics') return pathname === '/admin' && section === 'analytics'
    if (match === 'orders') return pathname.startsWith('/admin/collections/orders')
    if (match === 'customers') return pathname.startsWith('/admin/collections/users')
    if (match === 'inventory') {
      return pathname.startsWith('/admin/collections/products') && hasInventoryFilter
    }
    if (match === 'products') {
      return pathname.startsWith('/admin/collections/products') && !hasInventoryFilter
    }
    if (match === 'marketing') {
      return (
        pathname.startsWith('/admin/collections/forms') ||
        pathname.startsWith('/admin/collections/form-submissions')
      )
    }
    return [
      '/admin/collections/pages',
      '/admin/collections/categories',
      '/admin/collections/tags',
      '/admin/collections/media',
    ].some((path) => pathname.startsWith(path))
  }

  const closeMobileNav = () => setNavOpen(false)

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const query = new FormData(event.currentTarget).get('query')?.toString().trim()
    if (!query) return
    router.push(`/admin/collections/products?search=${encodeURIComponent(query)}`)
    closeMobileNav()
  }

  const displayName = user?.name?.trim() || user?.email?.split('@')[0] || 'Administrator'

  return (
    <aside
      aria-label="Admin navigation"
      className={`nav custom-admin-nav${navOpen ? ' custom-admin-nav--open' : ''}`}
      ref={navRef}
    >
      <div className="custom-admin-nav__brand">
        <span>Marisol</span>
        <small>Ecommerce</small>
      </div>

      <form className="custom-admin-nav__search" onSubmit={submitSearch} role="search">
        <SearchIcon />
        <input aria-label="Search products" name="query" placeholder="Search" ref={searchRef} />
        <kbd>⌘ K</kbd>
      </form>

      <nav className="custom-admin-nav__links">
        {mainLinks.map(({ Icon: NavIcon, href, label, match }) => {
          const active = isActive(match)
          return (
            <Link
              aria-current={active ? 'page' : undefined}
              className={`custom-admin-nav__link${active ? ' custom-admin-nav__link--active' : ''}`}
              href={href}
              key={label}
              onClick={closeMobileNav}
            >
              <NavIcon />
              <span>{label}</span>
              {match === 'orders' && orderCount !== null ? (
                <span className="custom-admin-nav__count">{orderCount}</span>
              ) : null}
            </Link>
          )
        })}
      </nav>

      <div className="custom-admin-nav__footer">
        <Link
          aria-current={pathname.startsWith('/admin/globals/settings') ? 'page' : undefined}
          className={`custom-admin-nav__link${pathname.startsWith('/admin/globals/settings') ? ' custom-admin-nav__link--active' : ''}`}
          href="/admin/globals/settings"
          onClick={closeMobileNav}
        >
          <SettingsIcon />
          <span>Settings</span>
        </Link>

        <Link className="custom-admin-nav__account" href="/admin/account" onClick={closeMobileNav}>
          <span className="custom-admin-nav__avatar">
            {initialsFor(user?.name, user?.email)}
          </span>
          <span className="custom-admin-nav__identity">
            <strong>{displayName}</strong>
            <small>Admin</small>
          </span>
          <ChevronIcon />
        </Link>
      </div>
    </aside>
  )
}
