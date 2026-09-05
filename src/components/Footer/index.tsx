import type { Footer } from '@/payload-types'

import { ThemeSelector } from '@/providers/Theme/ThemeSelector'
import { getCachedGlobal } from '@/utilities/getGlobals'
import Link from 'next/link'
import React from 'react'

const { COMPANY_NAME, SITE_NAME } = process.env

const productLinks = [
  { label: 'Shop all', url: '/shop' },
  { label: 'Skin care', url: '/shop?category=skin-care' },
  { label: 'Body products', url: '/shop?category=body' },
  { label: 'Anti-aging care', url: '/shop?category=anti-aging' },
  { label: 'Organic products', url: '/shop?category=organic' },
]

const infoLinks = [
  { label: 'About us', url: '/about' },
  { label: 'Find my order', url: '/find-order' },
  { label: 'Admin', url: '/admin' },
]

const moreLinks = [
  { label: 'Privacy policy', url: '/about' },
  { label: 'Terms of service', url: '/about' },
  { label: 'Shipping & returns', url: '/about' },
]

function Social() {
  const cls = 'text-muted-foreground transition-colors hover:text-foreground'
  return (
    <div className="mt-6 flex items-center gap-5">
      <a href="#" aria-label="Instagram" className={cls}>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
        </svg>
      </a>
      <a href="#" aria-label="Facebook" className={cls}>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <path d="M14 8.5h2V6h-2c-1.7 0-3 1.3-3 3v2H9v2.5h2V21h2.5v-6.5H16l.5-2.5h-3V9c0-.3.2-.5.5-.5z" />
        </svg>
      </a>
      <a href="#" aria-label="TikTok" className={cls}>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <path d="M16 3c.3 2 1.6 3.4 3.5 3.6V9c-1.3 0-2.5-.4-3.5-1.1v5.8c0 3-2.2 5.3-5 5.3s-5-2.4-5-5.3 2.2-5.3 5-5.3c.3 0 .6 0 .9.1v2.6a2.6 2.6 0 0 0-.9-.2c-1.4 0-2.5 1.2-2.5 2.8s1.1 2.8 2.5 2.8 2.5-1.2 2.5-2.8V3H16z" />
        </svg>
      </a>
    </div>
  )
}

export async function Footer() {
  // still fetched so a store owner's CMS nav stays wired if they prefer it
  const _footer: Footer = await getCachedGlobal('footer', 1)()
  void _footer
  const currentYear = new Date().getFullYear()
  const name = COMPANY_NAME || SITE_NAME || 'Marisol'

  const Column = ({ title, links }: { title: string; links: { label: string; url: string }[] }) => (
    <div>
      <h2 className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{title}</h2>
      <ul className="mt-4 space-y-3">
        {links.map((l) => (
          <li key={l.label}>
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
  )

  return (
    <footer className="mt-24 border-t border-border bg-secondary/40">
      <div className="container grid grid-cols-2 gap-10 py-16 md:grid-cols-12 md:gap-8">
        <div className="col-span-2 md:col-span-4">
          <Link href="/" className="font-display text-2xl tracking-[0.06em] text-foreground">
            {name}
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Clean, effective skincare made with naturally-derived ingredients — for skin&rsquo;s own
            radiance.
          </p>
          <Social />
        </div>

        <div className="md:col-span-3">
          <Column title="Products" links={productLinks} />
        </div>
        <div className="md:col-span-2">
          <Column title="Information" links={infoLinks} />
        </div>
        <div className="md:col-span-2">
          <Column title="More" links={moreLinks} />
        </div>
        <div className="flex items-start md:col-span-1 md:justify-end">
          <ThemeSelector />
        </div>
      </div>

      <div className="border-t border-border/70">
        <div className="container flex flex-col gap-2 py-6 text-sm text-muted-foreground md:flex-row md:items-center">
          <p>
            &copy; {currentYear} {name}. All rights reserved.
          </p>
          <p className="md:ml-auto">A Payload CMS + Next.js commerce template.</p>
        </div>
      </div>
    </footer>
  )
}
