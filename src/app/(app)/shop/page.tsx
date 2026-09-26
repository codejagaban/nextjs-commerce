import { Grid } from '@/components/Grid'
import { ProductGridItem } from '@/components/ProductGridItem'
import { ShopEmptyState } from '@/components/shop/EmptyState'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'

import { DEFAULT_CURRENCY_CODE, priceSelect } from '@/currencies'
import { getStoreCurrency } from '@/utilities/getStoreCurrency'
import { getCanonicalURL } from '@/utilities/siteURL'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'

export const metadata = {
  alternates: { canonical: getCanonicalURL('/shop') },
  description: 'Search for products in the store.',
  openGraph: mergeOpenGraph({ title: 'Shop', url: getCanonicalURL('/shop') }),
  title: 'Shop',
}

type SearchParams = { [key: string]: string | string[] | undefined }

type Props = {
  searchParams: Promise<SearchParams>
}

export default async function ShopPage({ searchParams }: Props) {
  const currency = await getStoreCurrency()
  const { q: searchValue, sort, category, tag } = await searchParams
  const payload = await getPayload({ config: configPromise })

  // `category` / `tag` may be a single slug, a comma-separated list, or repeated params.
  const toSlugs = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v : v ? v.split(',') : []).filter(Boolean)
  const categorySlugs = toSlugs(category)
  const tagSlugs = toSlugs(tag)

  /**
   * The sort links name the base currency's price column. Sorting by price has to
   * follow the currency on display, or "low to high" orders by a figure nobody
   * can see.
   */
  const sortBy =
    typeof sort === 'string' ? sort.replace(DEFAULT_CURRENCY_CODE, currency) : undefined

  const products = await payload.find({
    collection: 'products',
    draft: false,
    overrideAccess: false,
    depth: 1,
    select: {
      title: true,
      slug: true,
      gallery: true,
      categories: true,
      ...priceSelect,
      enableVariants: true,
    },
    ...(sortBy ? { sort: sortBy } : { sort: 'title' }),
    ...(searchValue || categorySlugs.length || tagSlugs.length
      ? {
          where: {
            and: [
              {
                _status: {
                  equals: 'published',
                },
              },
              ...(searchValue
                ? [
                    {
                      or: [
                        {
                          title: {
                            like: searchValue,
                          },
                        },
                        {
                          // `description` is richText (Lexical JSON) and cannot be
                          // matched with `like` — including it made the whole query
                          // throw, so every search returned nothing. `meta.description`
                          // holds the same copy as plain text and is queryable.
                          'meta.description': {
                            like: searchValue,
                          },
                        },
                      ],
                    },
                  ]
                : []),
              ...(categorySlugs.length
                ? [
                    {
                      'categories.slug': {
                        in: categorySlugs,
                      },
                    },
                  ]
                : []),
              ...(tagSlugs.length
                ? [
                    {
                      'tags.slug': {
                        in: tagSlugs,
                      },
                    },
                  ]
                : []),
            ],
          },
        }
      : {}),
  })

  const resultsText = products.docs.length > 1 ? 'results' : 'result'
  const isEmpty = products.docs.length === 0
  const activeFilters = [...categorySlugs, ...tagSlugs]

  // Recovery links: each drops one concern and keeps the other, so a shopper can
  // widen the search without losing the filters they set, or the reverse.
  const buildHref = (params: Record<string, string | undefined>) => {
    const sp = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v) sp.set(k, v)
    })
    const qs = sp.toString()
    return qs ? `/shop?${qs}` : '/shop'
  }
  const sortValue = typeof sort === 'string' ? sort : undefined
  const clearSearchHref = buildHref({
    category: categorySlugs.join(',') || undefined,
    tag: tagSlugs.join(',') || undefined,
    sort: sortValue,
  })
  const clearFiltersHref = buildHref({
    q: typeof searchValue === 'string' ? searchValue : undefined,
    sort: sortValue,
  })

  // Only fetched when there is nothing to show, so a normal page pays no cost.
  const suggestions = isEmpty
    ? (
        await payload.find({
          collection: 'categories',
          depth: 0,
          limit: 5,
          sort: 'title',
        })
      ).docs
    : []

  return (
    <div>
      {searchValue && !isEmpty ? (
        <p className="mb-4">
          {`Showing ${products.docs.length} ${resultsText} for `}
          <span className="font-bold">&quot;{searchValue}&quot;</span>
        </p>
      ) : null}

      {isEmpty ? (
        <ShopEmptyState
          activeFilters={activeFilters}
          clearFiltersHref={clearFiltersHref}
          clearSearchHref={clearSearchHref}
          searchValue={typeof searchValue === 'string' ? searchValue : undefined}
          suggestions={suggestions}
        />
      ) : (
        <Grid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.docs.map((product, i) => {
            // The first row is above the fold, so it carries the LCP image.
            return (
              <ProductGridItem
                currency={currency}
                key={product.id}
                priority={i < 3}
                product={product}
              />
            )
          })}
        </Grid>
      )}
    </div>
  )
}
