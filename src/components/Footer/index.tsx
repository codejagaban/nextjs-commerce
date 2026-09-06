import type { Footer } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { ThemeSelector } from '@/providers/Theme/ThemeSelector'
import { getCachedGlobal } from '@/utilities/getGlobals'
import Link from 'next/link'
import React from 'react'
import { SunMark } from '@/components/Logo/MarisolMark'

const { COMPANY_NAME, SITE_NAME } = process.env

const shopLinks = [
  { label: 'Skin care', url: '/shop?category=skin-care' },
  { label: 'Body products', url: '/shop?category=body' },
  { label: 'Anti-aging care', url: '/shop?category=anti-aging' },
  { label: 'Organic products', url: '/shop?category=organic' },
]

/** Card-brand marks shown in a small "we accept" strip. Real, recognisable marks. */
function PaymentMethods() {
  const tile = 'h-6 w-auto rounded-[3px]'
  return (
    <div className="flex items-center gap-1.5" aria-label="Accepted payment methods">
      {/* Visa */}
      <svg viewBox="0 0 40 26" className={tile} role="img" aria-label="Visa">
        <rect width="40" height="26" rx="4" fill="#fff" stroke="#e6e0d6" />
        <text
          x="20"
          y="17.5"
          textAnchor="middle"
          fontFamily="Arial, sans-serif"
          fontStyle="italic"
          fontWeight="700"
          fontSize="11"
          fill="#1A1F71"
        >
          VISA
        </text>
      </svg>
      {/* Mastercard */}
      <svg viewBox="0 0 40 26" className={tile} role="img" aria-label="Mastercard">
        <rect width="40" height="26" rx="4" fill="#fff" stroke="#e6e0d6" />
        <circle cx="17" cy="13" r="7" fill="#EB001B" />
        <circle cx="24" cy="13" r="7" fill="#F79E1B" />
        <path d="M20.5 7.7a7 7 0 0 0 0 10.6 7 7 0 0 0 0-10.6z" fill="#FF5F00" />
      </svg>
      {/* Amex */}
      <svg viewBox="0 0 40 26" className={tile} role="img" aria-label="American Express">
        <rect width="40" height="26" rx="4" fill="#2E77BC" />
        <text
          x="20"
          y="16.5"
          textAnchor="middle"
          fontFamily="Arial, sans-serif"
          fontWeight="700"
          fontSize="7.5"
          fill="#fff"
        >
          AMEX
        </text>
      </svg>
      {/* PayPal */}
      <svg viewBox="0 0 40 26" className={tile} role="img" aria-label="PayPal">
        <rect width="40" height="26" rx="4" fill="#fff" stroke="#e6e0d6" />
        <text
          x="20"
          y="17"
          textAnchor="middle"
          fontFamily="Arial, sans-serif"
          fontStyle="italic"
          fontWeight="700"
          fontSize="9"
        >
          <tspan fill="#003087">Pay</tspan>
          <tspan fill="#009CDE">Pal</tspan>
        </text>
      </svg>
      {/* Apple Pay */}
      <svg viewBox="0 0 40 26" className={tile} role="img" aria-label="Apple Pay">
        <rect width="40" height="26" rx="4" fill="#fff" stroke="#e6e0d6" />
        <g fill="#111">
          <path d="M11.7 9.7c.3-.4.5-.9.45-1.4-.44.02-.98.29-1.3.66-.29.32-.54.84-.47 1.33.5.04 1-.25 1.32-.59zm.44.7c-.72-.04-1.33.41-1.67.41-.35 0-.87-.39-1.43-.38-.74.01-1.42.43-1.8 1.09-.77 1.33-.2 3.3.55 4.38.36.53.8 1.12 1.37 1.1.55-.02.76-.35 1.42-.35.66 0 .85.35 1.43.34.59-.01.96-.54 1.32-1.07.42-.61.59-1.2.6-1.23-.01-.01-1.15-.44-1.16-1.75-.01-1.09.89-1.61.93-1.64-.51-.75-1.3-.83-1.58-.85z" />
          <text x="18" y="17" fontFamily="Arial, sans-serif" fontWeight="600" fontSize="9" fill="#111">
            Pay
          </text>
        </g>
      </svg>
    </div>
  )
}

export async function Footer() {
  const footer: Footer = await getCachedGlobal('footer', 1)()
  const menu = footer.navItems || []
  const currentYear = new Date().getFullYear()
  const name = COMPANY_NAME || SITE_NAME || 'Marisol'

  return (
    <footer className="grain relative mt-28 overflow-hidden border-t border-border bg-secondary/50">
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
              Clean, effective skincare made with naturally-derived ingredients, for skin&rsquo;s own
              natural radiance.
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
        <div className="flex flex-col gap-4 border-t border-border/70 py-6 text-sm text-muted-foreground md:flex-row md:items-center">
          <p>
            &copy; {currentYear} {name}. All rights reserved.
          </p>
          <div className="flex items-center gap-2 md:ml-auto">
            <span className="mr-1 text-xs uppercase tracking-[0.12em]">We accept</span>
            <PaymentMethods />
          </div>
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
