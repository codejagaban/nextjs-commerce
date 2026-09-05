import type { Footer } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { ThemeSelector } from '@/providers/Theme/ThemeSelector'
import { getCachedGlobal } from '@/utilities/getGlobals'
import Link from 'next/link'
import React from 'react'
import { SunMark } from '@/components/Logo/MarisolMark'

const { COMPANY_NAME, SITE_NAME } = process.env

const shopLinks = [
  { label: 'Olive Oil', url: '/shop?category=olive-oil' },
  { label: 'Vinegar', url: '/shop?category=vinegar' },
  { label: 'Pantry', url: '/shop?category=pantry' },
  { label: 'Honey', url: '/shop?category=honey' },
  { label: 'Gifts', url: '/shop?category=gifts' },
]

export async function Footer() {
  const footer: Footer = await getCachedGlobal('footer', 1)()
  const menu = footer.navItems || []
  const currentYear = new Date().getFullYear()
  const name = COMPANY_NAME || SITE_NAME || 'Marisol'

  return (
    <footer className="relative mt-28 overflow-hidden border-t border-border bg-secondary/50 grain">
      <div className="container relative z-10">
        <div className="grid grid-cols-2 gap-10 py-16 md:grid-cols-12 md:gap-8">
          {/* brand */}
          <div className="col-span-2 md:col-span-5">
            <Link href="/" aria-label="Marisol — home" className="inline-flex items-center gap-2.5">
              <SunMark className="h-7 w-7" />
              <span className="font-display text-2xl leading-none tracking-[0.02em] text-foreground">
                Marisol
              </span>
            </Link>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Single-estate olive oil and Mediterranean pantry. Harvested by hand, pressed the same
              day, bottled by the season.
            </p>
          </div>

          {/* shop */}
          <div className="md:col-span-3">
            <h2 className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Shop</h2>
            <ul className="mt-4 space-y-3">
              {shopLinks.map((l) => (
                <li key={l.url}>
                  <Link
                    href={l.url}
                    className="text-sm text-foreground/80 transition-colors hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* explore */}
          <div className="md:col-span-2">
            <h2 className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Explore</h2>
            <ul className="mt-4 space-y-3">
              {menu.map((item) => (
                <li key={item.id}>
                  <CMSLink
                    {...item.link}
                    appearance="inline"
                    className="text-sm text-foreground/80 transition-colors hover:text-foreground"
                  />
                </li>
              ))}
            </ul>
          </div>

          {/* theme */}
          <div className="flex items-start md:col-span-2 md:justify-end">
            <ThemeSelector />
          </div>
        </div>

        {/* colophon */}
        <div className="flex flex-col gap-2 border-t border-border/70 py-6 text-sm text-muted-foreground md:flex-row md:items-center">
          <p>
            &copy; {currentYear} {name}. All rights reserved.
          </p>
          <p className="md:ml-auto">A Payload CMS + Next.js commerce template.</p>
        </div>
      </div>

      {/* oversized wordmark — anchored to the bottom edge, on top of the surface,
          padded clear at the top so the caps are never sliced. */}
      <div
        aria-hidden="true"
        className="pointer-events-none relative z-10 flex justify-center px-4 pt-4"
      >
        <span className="block translate-y-[0.14em] select-none font-display text-[22vw] leading-[0.8] tracking-[0.01em] text-foreground/[0.06] md:text-[20vw]">
          Marisol
        </span>
      </div>
    </footer>
  )
}
