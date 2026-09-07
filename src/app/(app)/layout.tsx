import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { AdminBar } from '@/components/AdminBar'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { ensureStartsWith } from '@/utilities/ensureStartsWith'
import { getSettings } from '@/utilities/getSettings'
import { Providers } from '@/providers'
import { InitTheme } from '@/providers/Theme/InitTheme'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import localFont from 'next/font/local'
import React from 'react'
import './globals.css'

// Editorial display serif (self-hosted from Fontshare — off the Google slop shelf).
const sentient = localFont({
  src: [
    { path: '../../fonts/Sentient-Variable.woff2', style: 'normal', weight: '200 800' },
    { path: '../../fonts/Sentient-VariableItalic.woff2', style: 'italic', weight: '200 800' },
  ],
  variable: '--font-sentient',
  display: 'swap',
})

const SITE_NAME = process.env.SITE_NAME || 'Marisol'
const TWITTER_CREATOR = process.env.TWITTER_CREATOR
const TWITTER_SITE = process.env.TWITTER_SITE
const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
const twitterCreator = TWITTER_CREATOR ? ensureStartsWith(TWITTER_CREATOR, '@') : undefined
const twitterSite = TWITTER_SITE ? ensureStartsWith(TWITTER_SITE, 'https://') : undefined

/**
 * Read from Store settings rather than declared as a constant, so a clone of this
 * template renames itself from the admin. The env vars remain the fallback for a
 * database that has not been seeded yet.
 */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  const name = settings?.storeName || SITE_NAME
  const title = settings?.metaTitle || name
  const description = settings?.metaDescription || undefined

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: title,
      template: `%s | ${name}`,
    },
    ...(description ? { description } : {}),
    openGraph: {
      type: 'website',
      siteName: name,
      title,
      url: baseUrl,
      ...(description ? { description } : {}),
    },
    robots: { follow: true, index: true },
    ...(twitterCreator && twitterSite
      ? {
          twitter: {
            card: 'summary_large_image',
            creator: twitterCreator,
            site: twitterSite,
          },
        }
      : {}),
  }
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      className={[GeistSans.variable, GeistMono.variable, sentient.variable]
        .filter(Boolean)
        .join(' ')}
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <InitTheme />
        <link href="/favicon.ico" rel="icon" sizes="32x32" />
        <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
      </head>
      <body>
        <Providers>
          <AdminBar />
          <LivePreviewListener />

          <Header />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  )
}
