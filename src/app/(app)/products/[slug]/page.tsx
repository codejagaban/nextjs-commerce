import type { Media, Product } from '@/payload-types'

import { RenderBlocks } from '@/blocks/RenderBlocks'
import { GridTileImage } from '@/components/Grid/tile'
import { Gallery } from '@/components/product/Gallery'
import { ProductDescription } from '@/components/product/ProductDescription'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { draftMode } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React, { Suspense } from 'react'
import { CaretLeft } from '@phosphor-icons/react/dist/ssr'
import { Metadata } from 'next'

import { priceFor, priceSelect } from '@/currencies'
import { getStoreCurrency } from '@/utilities/getStoreCurrency'
import { getSettings } from '@/utilities/getSettings'
import { DEFAULT_STORE_NAME } from '@/brand'
import { getCanonicalURL, getPublicMediaURL } from '@/utilities/siteURL'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'

type Args = {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params
  const product = await queryProductBySlug({ slug })

  if (!product) return notFound()

  const gallery = product.gallery?.filter((item) => typeof item.image === 'object') || []

  const metaImage = typeof product.meta?.image === 'object' ? product.meta?.image : undefined
  const canIndex = product._status === 'published'

  const seoImage = metaImage || (gallery.length ? (gallery[0]?.image as Media) : undefined)
  const settings = await getSettings()
  const storeName = settings?.storeName || DEFAULT_STORE_NAME
  const title = product.meta?.title || `${product.title} | ${storeName}`
  const canonical = getCanonicalURL(`/products/${slug}`)
  const imageURL = seoImage?.url ? getPublicMediaURL(seoImage.url) : undefined

  return {
    alternates: { canonical },
    description: product.meta?.description || undefined,
    openGraph: mergeOpenGraph({
      type: 'website',
      siteName: storeName,
      title,
      url: canonical,
      ...(imageURL
        ? {
            images: [
              {
                alt: seoImage?.alt || product.title,
                url: imageURL,
                width: seoImage?.width || undefined,
                height: seoImage?.height || undefined,
              },
            ],
          }
        : {}),
    }),
    ...(imageURL ? { twitter: { card: 'summary_large_image', images: [imageURL] } } : {}),
    robots: {
      follow: canIndex,
      googleBot: {
        follow: canIndex,
        index: canIndex,
      },
      index: canIndex,
    },
    title: { absolute: title },
  }
}

export default async function ProductPage({ params }: Args) {
  const { slug } = await params
  const product = await queryProductBySlug({ slug })

  if (!product) return notFound()

  const gallery =
    product.gallery
      ?.filter((item) => typeof item.image === 'object')
      .map((item) => ({
        ...item,
        image: item.image as Media,
      })) || []

  const metaImage = typeof product.meta?.image === 'object' ? product.meta?.image : undefined
  const [currency, settings] = await Promise.all([getStoreCurrency(), getSettings()])
  const variants = product.enableVariants
    ? product.variants?.docs
        ?.filter((variant) => typeof variant === 'object' && variant !== null)
        .map((variant) => ({
          price: priceFor(variant, currency),
          inStock: (variant.inventory || 0) > 0,
        }))
        .filter(
          (variant): variant is { price: number; inStock: boolean } =>
            typeof variant.price === 'number',
        ) || []
    : []
  const price = priceFor(product, currency)
  // Google asks for an Offer, not AggregateOffer, for variants. Use the lowest
  // purchasable variant and keep its price and availability together.
  const selectedVariant = [...variants].sort(
    (a, b) => Number(b.inStock) - Number(a.inStock) || a.price - b.price,
  )[0]
  const offerPrice = selectedVariant?.price ?? price
  const offerInStock = selectedVariant?.inStock ?? (product.inventory || 0) > 0
  const canonical = getCanonicalURL(`/products/${slug}`)
  const imageURLs = [metaImage, ...gallery.map((item) => item.image)]
    .filter((image): image is Media => Boolean(image?.url))
    .map((image) => getPublicMediaURL(image.url!))

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${canonical}#product`,
    name: product.title,
    url: canonical,
    ...(product.meta?.description ? { description: product.meta.description } : {}),
    ...(imageURLs.length ? { image: [...new Set(imageURLs)] } : {}),
    brand: { '@type': 'Brand', name: settings?.storeName || DEFAULT_STORE_NAME },
    ...(typeof offerPrice === 'number'
      ? {
          offers: {
            '@type': 'Offer',
            url: canonical,
            priceCurrency: currency,
            price: (offerPrice / 100).toFixed(2),
            availability: offerInStock
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
          },
        }
      : {}),
  }

  const relatedProducts =
    product.relatedProducts?.filter((relatedProduct) => typeof relatedProduct === 'object') ?? []

  return (
    <React.Fragment>
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd).replace(/</g, '\\u003c'),
        }}
        type="application/ld+json"
      />
      <div className="container pt-8 pb-20">
        <Link
          href="/shop"
          className="mb-8 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <CaretLeft className="h-4 w-4" />
          All products
        </Link>
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <Suspense
              fallback={
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-card" />
              }
            >
              {Boolean(gallery?.length) && <Gallery gallery={gallery} />}
            </Suspense>
          </div>

          <div className="lg:sticky lg:top-28 lg:self-start">
            <ProductDescription product={product} />
          </div>
        </div>
      </div>

      {product.layout?.length ? <RenderBlocks blocks={product.layout} /> : <></>}

      {relatedProducts.length ? (
        <div className="container">
          <RelatedProducts products={relatedProducts as Product[]} />
        </div>
      ) : (
        <></>
      )}
    </React.Fragment>
  )
}

async function RelatedProducts({ products }: { products: Product[] }) {
  if (!products.length) return null

  const currency = await getStoreCurrency()

  return (
    <div className="py-8">
      <h2 className="mb-6 font-display text-2xl text-foreground">You may also like</h2>
      <ul className="flex w-full gap-4 overflow-x-auto pt-1">
        {products.map((product) => (
          <li
            className="aspect-square w-full flex-none min-[475px]:w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/5"
            key={product.id}
          >
            <Link className="relative h-full w-full" href={`/products/${product.slug}`}>
              <GridTileImage
                label={{
                  amount: priceFor(product, currency)!,
                  title: product.title,
                }}
                media={product.meta?.image as Media}
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

const queryProductBySlug = async ({ slug }: { slug: string }) => {
  const { isEnabled: draft } = await draftMode()

  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'products',
    depth: 3,
    draft,
    limit: 1,
    overrideAccess: draft,
    pagination: false,
    where: {
      and: [
        {
          slug: {
            equals: slug,
          },
        },
        ...(draft ? [] : [{ _status: { equals: 'published' } }]),
      ],
    },
    populate: {
      variants: {
        title: true,
        ...priceSelect,
        inventory: true,
        options: true,
      },
    },
  })

  return result.docs?.[0] || null
}
