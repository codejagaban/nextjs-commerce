import type { Setting } from '@/payload-types'

import configPromise from '@payload-config'
import { cache } from 'react'
import { getPayload } from 'payload'

/**
 * Store settings for the current request.
 *
 * Deliberately NOT wrapped in `unstable_cache` like the other globals: settings
 * decide the currency prices are shown and charged in, so a stale copy is a
 * wrong price, not a slightly old nav item. React's `cache` dedupes the read
 * within a request — the footer, the metadata and the price provider share one
 * query — while a change takes effect on the very next request.
 */
export const getSettings = cache(async (): Promise<Setting | null> => {
  try {
    const payload = await getPayload({ config: configPromise })
    return (await payload.findGlobal({ slug: 'settings', depth: 1 })) as Setting
  } catch {
    // A database that has not been migrated yet still renders the storefront.
    return null
  }
})
