import type { MetadataRoute } from 'next'

import { getCanonicalURL, getSiteURL } from '@/utilities/siteURL'

export default function robots(): MetadataRoute.Robots {
  return {
    host: getSiteURL(),
    rules: [
      {
        userAgent: '*',
        disallow: ['/api/'],
      },
    ],
    sitemap: getCanonicalURL('/sitemap.xml'),
  }
}
