'use client'
import { CMSLink } from '@/components/Link'
import { Cart } from '@/components/Cart'
import { OpenCartButton } from '@/components/Cart/OpenCart'
import Link from 'next/link'
import React, { Suspense, useEffect, useState } from 'react'

import { MobileMenu } from './MobileMenu'
import type { Header } from 'src/payload-types'

import { usePathname } from 'next/navigation'
import { cn } from '@/utilities/cn'
import { MagnifyingGlass, User } from '@phosphor-icons/react/dist/ssr'
import { useAuth } from '@/providers/Auth'

type Props = {
  header: Header
}

export function HeaderClient({ header }: Props) {
  const menu = header.navItems || []
  const pathname = usePathname()
  const isHome = pathname === '/'
  const { user } = useAuth()

  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // On the homepage, float over the terracotta hero (light text) until scrolled.
  const overlay = isHome && !scrolled

  const isActive = (url?: string | null) =>
    url && url !== '/' ? pathname.startsWith(url.split('?')[0]) : false

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-40 transition-colors duration-300',
          overlay
            ? 'border-b border-transparent bg-transparent text-primary-foreground [&_a]:text-primary-foreground [&_button]:text-primary-foreground'
            : 'border-b border-border/70 bg-background/90 text-foreground backdrop-blur-md',
        )}
      >
        <nav className="container grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-4">
          {/* left: nav (desktop) / hamburger (mobile) */}
          <div className="flex items-center gap-6">
            <div className="md:hidden">
              <Suspense fallback={null}>
                <MobileMenu menu={menu} />
              </Suspense>
            </div>
            {menu.length ? (
              <ul className="hidden items-center gap-7 md:flex">
                {menu.map((item) => {
                  const active = isActive(item.link.url)
                  return (
                    <li key={item.id}>
                      <CMSLink
                        {...item.link}
                        appearance="inline"
                        className={cn(
                          'text-sm transition-colors',
                          overlay
                            ? 'opacity-90 hover:opacity-100'
                            : active
                              ? 'text-foreground'
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
          </div>

          {/* center: wordmark */}
          <Link
            href="/"
            aria-label="Marisol — home"
            className="justify-self-center font-display text-2xl tracking-[0.06em]"
          >
            Marisol
          </Link>

          {/* right: search + account + cart */}
          <div className="flex items-center justify-end gap-4">
            <Link
              href="/shop"
              aria-label="Search products"
              className="transition-opacity hover:opacity-70"
            >
              <MagnifyingGlass className="h-5 w-5" weight="light" />
            </Link>
            <Link
              href={user ? '/account' : '/login'}
              aria-label={user ? 'Your account' : 'Log in or sign up'}
              className="transition-opacity hover:opacity-70"
            >
              <User className="h-5 w-5" weight="light" />
            </Link>
            <Suspense fallback={<OpenCartButton />}>
              <Cart />
            </Suspense>
          </div>
        </nav>
      </header>

      {/* Fixed header needs a spacer on pages without a full-bleed hero. */}
      {!isHome && <div className="h-16" />}
    </>
  )
}
