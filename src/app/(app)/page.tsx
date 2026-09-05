import type { Metadata } from 'next'
import type { Product } from '@/payload-types'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import { ProductGridItem } from '@/components/ProductGridItem'
import { SunMark } from '@/components/Logo/MarisolMark'

export const metadata: Metadata = {
  title: 'Marisol — Single-estate olive oil & Mediterranean pantry',
  description:
    'Cold-pressed single-estate olive oil, hand-harvested and bottled by the season, with a small Mediterranean pantry of salt, honey and vinegar.',
}

async function getProducts(): Promise<Product[]> {
  const payload = await getPayload({ config: configPromise })
  const res = await payload.find({
    collection: 'products',
    depth: 1,
    limit: 12,
    overrideAccess: false,
    sort: 'createdAt',
    where: { _status: { equals: 'published' } },
    select: {
      title: true,
      slug: true,
      gallery: true,
      categories: true,
      priceInUSD: true,
      enableVariants: true,
    },
  })
  return res.docs as Product[]
}

const hasCategory = (p: Product, slug: string) =>
  Array.isArray(p.categories) &&
  p.categories.some((c) => typeof c === 'object' && c?.slug === slug)

export default async function HomePage() {
  const products = await getProducts()
  const oils = products.filter((p) => hasCategory(p, 'olive-oil')).slice(0, 4)
  const featured = (oils.length >= 4 ? oils : products.slice(0, 4)) as Product[]

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* Hero — type over a golden-hour sky, photograph as the horizon.     */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative flex min-h-[calc(100svh-73px)] flex-col overflow-hidden">
        <div className="atmosphere-warm grain pointer-events-none absolute inset-0 -z-10" />

        <div className="container relative flex flex-1 flex-col justify-center pt-20 pb-10">
          <p className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
            <SunMark className="h-4 w-4" />
            Single-estate · pressed the day it&rsquo;s picked
          </p>
          <h1 className="max-w-[16ch] font-display text-[clamp(2.9rem,8vw,6.5rem)] font-normal leading-[0.95] tracking-[-0.01em] text-foreground text-balance">
            Sunlight you can{' '}
            <span className="italic" style={{ color: 'var(--amber)' }}>
              pour
            </span>
            .
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty">
            Cold-pressed from a single terraced grove above the sea. Hand-harvested, bottled by the
            season, and shipped while it&rsquo;s still bright.
          </p>
          <div className="mt-9 flex items-center gap-6">
            <Link
              href="/shop"
              className="inline-flex h-12 items-center rounded-full bg-primary px-7 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Shop the harvest
            </Link>
            <Link
              href="/about"
              className="group inline-flex items-center gap-1.5 text-sm text-foreground/70 transition-colors hover:text-foreground"
            >
              Our story
              <span className="transition-transform duration-300 group-hover:translate-x-0.5">
                &rarr;
              </span>
            </Link>
          </div>
        </div>

        {/* horizon band — feathered top and bottom so it dissolves into the page */}
        <div className="relative h-[34svh] min-h-[220px] w-full">
          <Image
            src="/brand/landscape-hero-01.jpg"
            alt="Sunlit Mediterranean olive grove at golden hour"
            fill
            priority
            sizes="100vw"
            className="object-cover"
            style={{
              maskImage:
                'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 14%, #000 34%, #000 72%, transparent 100%)',
              WebkitMaskImage:
                'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 14%, #000 34%, #000 72%, transparent 100%)',
            }}
          />
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Featured harvest                                                   */}
      {/* ------------------------------------------------------------------ */}
      <section className="container py-20 md:py-28">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
          <h2 className="max-w-[18ch] font-display text-3xl leading-tight text-foreground md:text-[2.75rem]">
            This season&rsquo;s pressing
          </h2>
          <Link
            href="/shop"
            className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            All products
            <span className="transition-transform duration-300 group-hover:translate-x-0.5">
              &rarr;
            </span>
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-6 md:gap-8 lg:grid-cols-4">
          {featured.map((product, i) => (
            <ProductGridItem key={product.id} product={product} priority={i < 2} />
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Story strip                                                        */}
      {/* ------------------------------------------------------------------ */}
      <section className="container grid items-center gap-10 pb-24 md:grid-cols-2 md:gap-16">
        <div className="relative order-2 aspect-[5/6] overflow-hidden rounded-2xl border border-border/60 md:order-1">
          <Image
            src="/brand/landscape-hero-03.jpg"
            alt="Olive trees on the Marisol estate at golden hour"
            fill
            sizes="(min-width: 768px) 45vw, 90vw"
            className="object-cover"
          />
        </div>
        <div className="order-1 md:order-2">
          <h2 className="max-w-[20ch] font-display text-3xl leading-tight text-foreground md:text-[2.75rem]">
            One grove. Pressed the same day it&rsquo;s picked.
          </h2>
          <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground text-pretty">
            We farm what we sell. The fruit goes from the tree to the press within hours, because
            that is the only way to keep the grove in the bottle: green, peppery and alive.
          </p>
          <Link
            href="/about"
            className="group mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-primary"
          >
            Read our story
            <span className="transition-transform duration-300 group-hover:translate-x-0.5">
              &rarr;
            </span>
          </Link>
        </div>
      </section>
    </>
  )
}
