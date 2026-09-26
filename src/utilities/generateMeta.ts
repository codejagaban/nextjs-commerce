import type { Metadata } from 'next'

import type { Page, Product } from '../payload-types'

import { DEFAULT_STORE_NAME } from '@/brand'
import { getSettings } from './getSettings'
import { mergeOpenGraph } from './mergeOpenGraph'
import { getCanonicalURL, getPublicMediaURL } from './siteURL'

export const generateMeta = async (args: { doc: Page | Product }): Promise<Metadata> => {
  const { doc } = args || {}
  const settings = await getSettings()
  const title = doc?.meta?.title || doc?.title || settings?.storeName || DEFAULT_STORE_NAME
  const description = doc?.meta?.description || settings?.metaDescription || undefined
  const path = doc?.slug === 'home' ? '/' : `/${doc?.slug || ''}`
  const canonical = getCanonicalURL(path)

  const ogImage =
    typeof doc?.meta?.image === 'object' &&
    doc.meta.image !== null &&
    'url' in doc.meta.image &&
    doc.meta.image.url
      ? getPublicMediaURL(doc.meta.image.url)
      : undefined

  return {
    description,
    alternates: { canonical },
    openGraph: mergeOpenGraph({
      ...(description ? { description } : {}),
      images: ogImage
        ? [
            {
              url: ogImage,
            },
          ]
        : undefined,
      siteName: settings?.storeName || DEFAULT_STORE_NAME,
      title,
      url: canonical,
    }),
    ...(ogImage ? { twitter: { card: 'summary_large_image', images: [ogImage] } } : {}),
    title: { absolute: title },
  }
}
