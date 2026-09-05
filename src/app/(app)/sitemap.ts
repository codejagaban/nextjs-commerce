import type { MetadataRoute } from 'next'

import configPromise from '@payload-config'
import { getPayload } from 'payload'

const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

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
    { url: `${baseUrl}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/shop`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/about`, changeFrequency: 'monthly', priority: 0.6 },
  ]

  const productRoutes: MetadataRoute.Sitemap = products.docs
    .filter((d) => d.slug)
    .map((d) => ({
      url: `${baseUrl}/products/${d.slug}`,
      lastModified: d.updatedAt ? new Date(d.updatedAt) : undefined,
      changeFrequency: 'weekly',
      priority: 0.7,
    }))

  const pageRoutes: MetadataRoute.Sitemap = pages.docs
    .filter((d) => d.slug && d.slug !== 'home')
    .map((d) => ({
      url: `${baseUrl}/${d.slug}`,
      lastModified: d.updatedAt ? new Date(d.updatedAt) : undefined,
      changeFrequency: 'monthly',
      priority: 0.6,
    }))

  return [...staticRoutes, ...productRoutes, ...pageRoutes]
}
