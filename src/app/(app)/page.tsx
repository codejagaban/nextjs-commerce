import type { Metadata } from 'next'
import type { Product } from '@/payload-types'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import { ProductGridItem } from '@/components/ProductGridItem'
import { NewsletterForm } from '@/components/NewsletterForm'
import { Drop, Leaf, ShieldCheck } from '@phosphor-icons/react/dist/ssr'

export const metadata: Metadata = {
  title: 'Marisol — Clean skincare for your natural radiance',
  description:
    'Naturally-derived serums, moisturisers and cleansers, formulated to reveal skin&rsquo;s own radiance.',
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
      priceInUSD: true,
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
    Icon: Drop,
  },
  {
    title: 'Dermatologist approved',
    body: 'Every product is tested and recommended by experts for visible, lasting results.',
    Icon: ShieldCheck,
  },
  {
    title: 'Sustainable beauty',
    body: 'Eco-friendly packaging and cruelty-free formulas for conscious self-care.',
    Icon: Leaf,
  },
]

const posts = [
  {
    title: '5 signs that your skin lacks moisture',
    body: 'How to spot dehydration early, and the routine that brings your barrier back to balance.',
    image: '/brand/lifestyle-01.jpg',
  },
  {
    title: 'Beauty from within: nutrition and skin health',
    body: 'The vitamins and habits that show up on your skin, and how to build them into your day.',
    image: '/brand/lifestyle-02.jpg',
  },
  {
    title: 'How to layer actives without irritation',
    body: 'Vitamin C, retinol and acids can coexist. Here is the order that keeps skin calm.',
    image: '/brand/lifestyle-03.jpg',
  },
]

const hasCategory = (p: Product, slug: string) =>
  Array.isArray(p.categories) && p.categories.some((c) => typeof c === 'object' && c?.slug === slug)

export default async function HomePage() {
  const products = await getProducts()
  const newArrivals = products.slice(0, 4)
  const bestsellers = products.slice(4, 8).length >= 4 ? products.slice(4, 8) : products.slice(0, 4)

  return (
    <>
      {/* ---------------------------------------------------------------- */}
      {/* Hero                                                             */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden bg-terracotta text-primary-foreground">
        <div className="container grid items-center gap-8 py-14 md:grid-cols-2 md:gap-6 md:py-0">
          <div className="order-2 max-w-lg md:order-1 md:py-24">
            <h1 className="font-display text-4xl leading-[1.05] md:text-6xl">
              Reveal your skin&rsquo;s natural radiance
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-primary-foreground/85">
              Naturally-derived serums, moisturisers and cleansers, made to give skin its own quiet
              glow.
            </p>
            <Link
              href="/shop"
              className="mt-8 inline-flex h-12 items-center rounded-full bg-background px-8 text-sm font-medium text-foreground transition-transform hover:px-9"
            >
              Shop now
            </Link>
          </div>
          <div className="relative order-1 h-[42vh] min-h-[300px] w-full md:order-2 md:h-[86vh]">
            <Image
              src="/brand/model-portrait-01.jpg"
              alt="Model with glowing, healthy skin"
              fill
              priority
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover md:rounded-none"
            />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* New arrivals                                                     */}
      {/* ---------------------------------------------------------------- */}
      <section className="container py-20 md:py-24">
        <div className="mb-12 flex items-center justify-between">
          <span className="hidden w-24 md:block" />
          <h2 className="text-center font-display text-3xl text-foreground md:text-4xl">
            New arrivals
          </h2>
          <Link
            href="/shop"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            View all
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {newArrivals.map((p, i) => (
            <ProductGridItem key={p.id} product={p} priority={i < 2} tile={TILES[i % TILES.length]} />
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Categories split                                                 */}
      {/* ---------------------------------------------------------------- */}
      <section className="bg-secondary/50">
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
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">About us</p>
        <h2 className="mx-auto mt-5 max-w-3xl font-display text-3xl leading-tight text-foreground md:text-4xl">
          We help you reveal your skin&rsquo;s natural radiance, selecting only the best from around
          the world.
        </h2>
        <div className="mx-auto mt-14 grid max-w-4xl gap-10 md:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="flex flex-col items-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-terracotta">
                <f.Icon className="h-6 w-6" weight="light" />
              </span>
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
        <div className="relative h-[62vh] min-h-[420px] w-full overflow-hidden">
          <Image
            src="/brand/still-life-01.jpg"
            alt="Marisol bestselling products"
            fill
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/45 to-transparent" />
          <div className="container relative flex h-full items-center">
            <div className="max-w-md text-background">
              <h2 className="font-display text-4xl md:text-5xl">Bestsellers</h2>
              <p className="mt-4 max-w-sm text-sm text-background/85">
                The routine our community reaches for first. Tried, tested and quietly effective.
              </p>
              <Link
                href="/shop"
                className="mt-7 inline-flex h-12 items-center rounded-full bg-background px-8 text-sm font-medium text-foreground transition-transform hover:px-9"
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
        <h2 className="mb-12 text-center font-display text-3xl text-foreground md:text-4xl">
          Loved by everyone
        </h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {bestsellers.map((p, i) => (
            <ProductGridItem key={p.id} product={p} tile={TILES[(i + 2) % TILES.length]} />
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Testimonial                                                      */}
      {/* ---------------------------------------------------------------- */}
      <section className="bg-secondary/50">
        <div className="container grid items-center gap-10 py-16 md:grid-cols-2 md:gap-16 md:py-20">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-terracotta/15 font-display text-lg text-terracotta">
                A
              </span>
              <div>
                <p className="font-medium text-foreground">Ashley</p>
                <p className="text-xs text-muted-foreground">Verified customer</p>
              </div>
            </div>
            <blockquote className="mt-6 font-display text-2xl leading-snug text-foreground md:text-[1.75rem]">
              &ldquo;I&rsquo;ve been using the night moisturiser for three weeks and my skin is
              softer, calmer and genuinely glowing. It absorbs fast and never feels greasy.&rdquo;
            </blockquote>
          </div>
          <div className="relative aspect-[5/4] overflow-hidden rounded-2xl">
            <Image
              src="/brand/model-portrait-03.jpg"
              alt="Customer applying Marisol skincare"
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
        <h2 className="mb-12 text-center font-display text-3xl text-foreground md:text-4xl">
          From the journal
        </h2>
        <div className="grid gap-8 md:grid-cols-3">
          {posts.map((post) => (
            <article key={post.title}>
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
              <span className="mt-3 inline-block text-sm font-medium text-terracotta">
                Read more
              </span>
            </article>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Newsletter band                                                  */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative">
        <div className="relative min-h-[440px] w-full overflow-hidden">
          <Image
            src="/brand/still-life-02.jpg"
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
          />
          <div className="container relative flex min-h-[440px] items-center justify-end py-16">
            <div className="w-full max-w-sm rounded-2xl bg-background p-8 shadow-sm">
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
    </>
  )
}
