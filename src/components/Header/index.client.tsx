'use client'
import { CMSLink } from '@/components/Link'
import { Cart } from '@/components/Cart'
import { OpenCartButton } from '@/components/Cart/OpenCart'
import Link from 'next/link'
import React, { Suspense } from 'react'

import { MobileMenu } from './MobileMenu'
import type { Header } from 'src/payload-types'

import { MarisolLogo } from '@/components/Logo/MarisolMark'
import { usePathname } from 'next/navigation'
import { cn } from '@/utilities/cn'

type Props = {
  header: Header
}

export function HeaderClient({ header }: Props) {
  const menu = header.navItems || []
  const pathname = usePathname()

  const isActive = (url?: string | null) =>
    url && url !== '/' ? pathname.startsWith(url.split('?')[0]) : false

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <nav className="container grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-4">
        {/* left: mobile menu + wordmark */}
        <div className="flex items-center gap-3">
          <div className="md:hidden">
            <Suspense fallback={null}>
              <MobileMenu menu={menu} />
            </Suspense>
          </div>
          <Link href="/" aria-label="Marisol — home">
            <MarisolLogo />
          </Link>
        </div>

        {/* center: primary nav */}
        {menu.length ? (
          <ul className="hidden items-center gap-8 md:flex">
            {menu.map((item) => {
              const active = isActive(item.link.url)
              return (
                <li key={item.id}>
                  <CMSLink
                    {...item.link}
                    appearance="inline"
                    className={cn(
                      'text-sm transition-colors',
                      active
                        ? 'font-medium text-foreground'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  />
                </li>
              )
            })}
          </ul>
        ) : (
          <span />
        )}

        {/* right: cart */}
        <div className="flex items-center justify-end gap-4">
          <Suspense fallback={<OpenCartButton />}>
            <Cart />
          </Suspense>
        </div>
      </nav>
    </header>
  )
}
