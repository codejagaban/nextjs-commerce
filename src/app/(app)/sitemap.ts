import type { MetadataRoute } from 'next'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { getCanonicalURL } from '@/utilities/siteURL'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const payload = await getPayload({ config: configPromise })

  const [products, pages] = await Promise.all([
    payload.find({
      collection: 'products',
      draft: false,
      limit: 1000,
      pagination: false,
      overrideAccess: false,
      select: { slug: true, updatedAt: true },
    }),
    payload.find({
      collection: 'pages',
      draft: false,
      limit: 1000,
      pagination: false,
      overrideAccess: false,
      select: { slug: true, updatedAt: true },
    }),
  ])

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: getCanonicalURL('/'), changeFrequency: 'weekly', priority: 1 },
    { url: getCanonicalURL('/shop'), changeFrequency: 'daily', priority: 0.9 },
  ]

  const productRoutes: MetadataRoute.Sitemap = products.docs
    .filter((d) => d.slug)
    .map((d) => ({
      url: getCanonicalURL(`/products/${d.slug}`),
      lastModified: d.updatedAt ? new Date(d.updatedAt) : undefined,
      changeFrequency: 'weekly',
      priority: 0.7,
    }))

  const pageRoutes: MetadataRoute.Sitemap = pages.docs
    .filter((d) => d.slug && !['home', 'shop'].includes(d.slug))
    .map((d) => ({
      url: getCanonicalURL(`/${d.slug}`),
      lastModified: d.updatedAt ? new Date(d.updatedAt) : undefined,
      changeFrequency: 'monthly',
      priority: 0.6,
    }))

  return [...staticRoutes, ...productRoutes, ...pageRoutes]
}
