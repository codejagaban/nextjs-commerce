import type { Metadata } from 'next'
import type { Product } from '@/payload-types'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import { ProductGridItem } from '@/components/ProductGridItem'
import { NewsletterForm } from '@/components/NewsletterForm'
import { MarkDroplet, MarkLeaf, MarkTested } from '@/components/Marks'
import { Horizon } from '@/components/Horizon'
import { SunMark } from '@/components/Logo/StoreMark'

import { priceSelect } from '@/currencies'
import { getStoreCurrency } from '@/utilities/getStoreCurrency'
import { getSettings } from '@/utilities/getSettings'
import { DEFAULT_STORE_NAME } from '@/brand'

/** Title and description come from Store settings, so a clone renames its home
 * page without a code change; the literals below are only the fallback. */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  return {
    title:
      settings?.metaTitle ||
      `${settings?.storeName || DEFAULT_STORE_NAME} — Clean skincare for your natural radiance`,
    description:
      settings?.metaDescription ||
      'Naturally-derived serums, moisturisers and cleansers, formulated to reveal skin&rsquo;s own radiance.',
  }
}

async function getProducts(): Promise<Product[]> {
  const payload = await getPayload({ config: configPromise })
  const res = await payload.find({
    collection: 'products',
    depth: 1,
    limit: 12,
    overrideAccess: false,
    sort: '-createdAt',
    where: { _status: { equals: 'published' } },
    select: {
      title: true,
      slug: true,
      gallery: true,
      categories: true,
      ...priceSelect,
      enableVariants: true,
    },
  })
  return res.docs as Product[]
}

const TILES = ['blush', 'sand', 'lilac', 'mauve']

const categories = [
  { label: 'Skin care', slug: 'skin-care' },
  { label: 'Body products', slug: 'body' },
  { label: 'Anti-aging care', slug: 'anti-aging' },
  { label: 'Organic products', slug: 'organic' },
]

const features = [
  {
    title: 'Pure ingredients',
    body: 'Only clean, safe and carefully selected components to protect your skin and health.',
    Icon: MarkDroplet,
  },
  {
    title: 'Dermatologist approved',
    body: 'Every product is tested and recommended by experts for visible, lasting results.',
    Icon: MarkTested,
  },
  {
    title: 'Sustainable beauty',
    body: 'Eco-friendly packaging and cruelty-free formulas for conscious self-care.',
    Icon: MarkLeaf,
  },
]

const posts = [
  {
    href: '/shop?tag=hydration',
    title: '5 signs that your skin lacks moisture',
    body: 'How to spot dehydration early, and the routine that brings your barrier back to balance.',
    image: '/brand/lifestyle-01.jpg',
  },
  {
    href: '/shop?category=organic',
    title: 'Beauty from within: nutrition and skin health',
    body: 'The vitamins and habits that show up on your skin, and how to build them into your day.',
    image: '/brand/lifestyle-02.jpg',
  },
  {
    href: '/shop?category=serums',
    title: 'How to layer actives without irritation',
    body: 'Vitamin C, retinol and acids can coexist. Here is the order that keeps skin calm.',
    image: '/brand/lifestyle-03.jpg',
  },
]

const hasCategory = (p: Product, slug: string) =>
  Array.isArray(p.categories) && p.categories.some((c) => typeof c === 'object' && c?.slug === slug)

export default async function HomePage() {
  const [products, currency, settings] = await Promise.all([
    getProducts(),
    getStoreCurrency(),
    getSettings(),
  ])
  const storeName = settings?.storeName || DEFAULT_STORE_NAME
  const newArrivals = products.slice(0, 4)
  const bestsellers = products.slice(4, 8).length >= 4 ? products.slice(4, 8) : products.slice(0, 4)

  return (
    <>
      {/* ---------------------------------------------------------------- */}
      {/* Hero                                                             */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative isolate flex min-h-svh flex-col justify-end overflow-hidden bg-terracotta-deep">
        {/* The field: one low, warm light raking across from the upper right,
            with real falloff. Not a symmetric bloom behind the subject. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(140% 105% at 80% -10%, oklch(68% 0.085 64deg) 0%, oklch(52% 0.082 44deg) 40%, oklch(37% 0.055 36deg) 76%, oklch(29% 0.035 34deg) 100%)',
          }}
        />

        {/* The portrait sits in the field and bleeds off the right. Its left edge
            dissolves into the light, so there is no seam down the middle. */}
        <div className="absolute inset-y-0 right-0 w-[78%] md:w-[62%] lg:w-[56%]">
          <Image
            src="/brand/model-portrait-01.jpg"
            alt="Model with glowing, healthy skin in low evening light"
            fill
            priority
            sizes="(min-width: 1024px) 56vw, (min-width: 768px) 62vw, 78vw"
            className="feather-left object-cover object-[38%_center]"
          />
        </div>
        {/* A whisper of the field's warmth over the portrait, feathered on the
            same curve as the image so the two never meet at an edge. */}
        <div
          aria-hidden="true"
          className="feather-left absolute inset-y-0 right-0 w-[78%] opacity-40 mix-blend-soft-light md:w-[62%] lg:w-[56%]"
          style={{ background: 'oklch(70% 0.1 56deg)' }}
        />

        {/* Grounds the type without becoming a band: fades out well before the edges. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-[78%]"
          style={{
            background:
              'linear-gradient(to top, oklch(24% 0.04 38deg / 0.86) 0%, oklch(24% 0.04 38deg / 0.6) 30%, oklch(24% 0.04 38deg / 0.26) 58%, transparent 100%)',
          }}
        />

        <div className="container relative z-10 pb-32 pt-32 md:pb-40">
          <div className="mb-7 flex items-center gap-4">
            <SunMark className="h-9 w-9 shrink-0" />
            <span className="h-px w-24 bg-bone/40 md:w-40" />
          </div>

          {/* Overlaps the portrait's edge — the composition reads in layers. */}
          <h1 className="max-w-[14ch] font-display text-[clamp(2.75rem,7.4vw,5.75rem)] leading-[0.96] text-bone">
            Reveal your skin&rsquo;s natural radiance
          </h1>

          <div className="mt-9 flex max-w-md flex-col items-start gap-7">
            <p className="text-base leading-relaxed text-bone/85">
              Naturally-derived serums, moisturisers and cleansers, made to give skin its own quiet
              glow.
            </p>
            <Link
              href="/shop"
              className="inline-flex h-12 items-center rounded-full bg-bone px-8 text-sm font-medium text-[oklch(24%_0.008_50deg)] transition-colors hover:bg-amber"
            >
              Shop now
            </Link>
          </div>
        </div>

        <Horizon className="relative z-10 -mb-px text-background" height={64} />
      </section>

      {/* The page carries one continuous golden-hour surface from here down. */}
      <div className="atmosphere-page grain relative">
      {/* ---------------------------------------------------------------- */}
      {/* New arrivals                                                     */}
      {/* ---------------------------------------------------------------- */}
      <section className="container py-20 md:py-24">
        <div className="mb-12 flex items-end justify-between gap-6">
          <h2 className="font-display text-3xl text-foreground md:text-4xl">New arrivals</h2>
          <Link
            href="/shop"
            className="pb-1 text-sm text-muted-foreground transition-colors hover:text-terracotta"
          >
            View all
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {newArrivals.map((p, i) => (
            <ProductGridItem
              currency={currency}
              key={p.id}
              priority={i < 2}
              product={p}
              tile={TILES[i % TILES.length]}
            />
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Categories split                                                 */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative bg-secondary/40">
        <div className="container grid items-center gap-10 py-16 md:grid-cols-2 md:gap-16 md:py-20">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl">
            <Image
              src="/brand/model-portrait-02.jpg"
              alt="Applying serum for a natural glow"
              fill
              sizes="(min-width: 768px) 45vw, 90vw"
              className="object-cover"
            />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Categories</p>
            <ul className="mt-6 space-y-4">
              {categories.map((c, i) => (
                <li key={c.slug}>
                  <Link
                    href={`/shop?category=${c.slug}`}
                    className={`font-display text-2xl transition-colors hover:text-terracotta md:text-3xl ${
                      i === categories.length - 1 ? 'text-foreground' : 'text-foreground/70'
                    }`}
                  >
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-6 max-w-sm text-sm text-muted-foreground">
              Experience the pure goodness of nature with organic products, kind to skin and planet.
            </p>
            <Link
              href="/shop"
              className="mt-8 inline-flex h-11 items-center rounded-full bg-primary px-7 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85"
            >
              All products
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* About / values                                                   */}
      {/* ---------------------------------------------------------------- */}
      <section className="container py-20 text-center md:py-28">
        <h2 className="mx-auto max-w-3xl font-display text-3xl leading-tight text-foreground md:text-4xl">
          We help you reveal your skin&rsquo;s natural radiance, selecting only the best from around
          the world.
        </h2>
        <div className="mx-auto mt-14 grid max-w-4xl gap-10 md:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="flex flex-col items-center">
              {/* Bare mark, no tile behind it. */}
              <f.Icon className="h-10 w-10 text-terracotta" />
              <h3 className="mt-5 font-display text-lg text-foreground">{f.title}</h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Bestsellers image band                                           */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative">
        <div className="relative h-[86vh] min-h-[560px] w-full">
          <Image
            src="/brand/still-life-01.jpg"
            alt={`${storeName} bestselling products`}
            fill
            sizes="100vw"
            className="feather-y object-cover"
          />
          <div
            aria-hidden="true"
            className="feather-y absolute inset-0"
            style={{
              background:
                'linear-gradient(to right, oklch(24% 0.04 38deg / 0.82) 0%, oklch(24% 0.04 38deg / 0.66) 26%, oklch(24% 0.04 38deg / 0.34) 46%, oklch(24% 0.04 38deg / 0.1) 62%, transparent 76%)',
            }}
          />
          <div className="container relative flex h-full items-center">
            <div className="max-w-md text-bone">
              <h2 className="font-display text-4xl md:text-5xl">Bestsellers</h2>
              <p className="mt-4 max-w-sm text-sm text-bone/85">
                The routine our community reaches for first. Tried, tested and quietly effective.
              </p>
              <Link
                href="/shop"
                className="mt-7 inline-flex h-12 items-center rounded-full bg-bone px-8 text-sm font-medium text-[oklch(24%_0.008_50deg)] transition-colors hover:bg-amber"
              >
                Shop now
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Best sellers product row                                         */}
      {/* ---------------------------------------------------------------- */}
      <section className="container py-20 md:py-24">
        <div className="mb-12 flex items-end justify-between gap-6">
          <h2 className="font-display text-3xl text-foreground md:text-4xl">Loved by everyone</h2>
          <p className="pb-1 text-sm text-muted-foreground">The four we resupply most</p>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {bestsellers.map((p, i) => (
            <ProductGridItem
              currency={currency}
              key={p.id}
              product={p}
              tile={TILES[(i + 2) % TILES.length]}
            />
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Testimonial                                                      */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative bg-secondary/40">
        <div className="container grid items-center gap-10 py-16 md:grid-cols-2 md:gap-16 md:py-20">
          <div>
            <blockquote className="font-display text-2xl leading-snug text-foreground md:text-[2rem]">
              I&rsquo;ve been using the night moisturiser for three weeks and my skin is softer,
              calmer and genuinely glowing. It absorbs fast and never feels greasy.
            </blockquote>
            <p className="mt-7 text-sm text-muted-foreground">Ashley, three weeks in</p>
          </div>
          <div className="relative aspect-[5/4] overflow-hidden rounded-2xl">
            <Image
              src="/brand/model-portrait-03.jpg"
              alt={`Customer applying ${storeName} skincare`}
              fill
              sizes="(min-width: 768px) 45vw, 90vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Journal / blog                                                   */}
      {/* ---------------------------------------------------------------- */}
      <section className="container py-20 md:py-24">
        <h2 className="mb-12 max-w-xl font-display text-2xl leading-snug text-foreground md:text-[1.75rem]">
          Notes on looking after your skin
        </h2>
        <div className="grid gap-8 md:grid-cols-3">
          {posts.map((post) => (
            <Link key={post.title} href={post.href} className="group block">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
                <Image
                  src={post.image}
                  alt={post.title}
                  fill
                  sizes="(min-width: 768px) 32vw, 90vw"
                  className="object-cover"
                />
              </div>
              <h3 className="mt-5 font-display text-xl leading-snug text-foreground">
                {post.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{post.body}</p>
              <span className="mt-3 inline-block text-sm font-medium text-terracotta transition-colors group-hover:text-terracotta-deep">
                Read more
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Newsletter band                                                  */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative">
        <div className="relative min-h-[620px] w-full">
          <Image
            src="/brand/still-life-02.jpg"
            alt=""
            fill
            sizes="100vw"
            className="feather-y object-cover"
          />
          <div className="container relative flex min-h-[440px] items-center justify-end py-16">
            <div className="w-full max-w-sm rounded-2xl bg-background p-8">
              <h2 className="font-display text-2xl text-foreground">
                Subscribe to get <span className="text-terracotta">10% off</span>
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Join for new arrivals, skincare tips and a welcome code for your first order.
              </p>
              <NewsletterForm />
            </div>
          </div>
        </div>
      </section>
      </div>
    </>
  )
}
