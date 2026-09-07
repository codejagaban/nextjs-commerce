import type { Media, Product, ThreeItemGridBlock as ThreeItemGridBlockProps } from '@/payload-types'

import { GridTileImage } from '@/components/Grid/tile'
import Link from 'next/link'
import React from 'react'
import type { DefaultDocumentIDType } from 'payload'

import { priceFor } from '@/currencies'
import { getStoreCurrency } from '@/utilities/getStoreCurrency'

type Props = { currency: string; item: Product; priority?: boolean; size: 'full' | 'half' }

export const ThreeItemGridItem: React.FC<Props> = ({ currency, item, size }) => {
  let price = priceFor(item, currency)

  if (item.enableVariants && item.variants?.docs?.length) {
    const variant = item.variants.docs[0]

    if (variant && typeof variant === 'object') {
      const variantPrice = priceFor(variant, currency)
      if (variantPrice !== undefined) price = variantPrice
    }
  }

  return (
    <div
      className={size === 'full' ? 'md:col-span-4 md:row-span-2' : 'md:col-span-2 md:row-span-1'}
    >
      <Link className="relative block aspect-square h-full w-full" href={`/products/${item.slug}`}>
        <GridTileImage
          label={{
            amount: price!,
            position: size === 'full' ? 'center' : 'bottom',
            title: item.title,
          }}
          media={item.meta?.image as Media}
        />
      </Link>
    </div>
  )
}

export const ThreeItemGridBlock: React.FC<
  ThreeItemGridBlockProps & {
    id?: DefaultDocumentIDType
    className?: string
  }
> = async ({ products }) => {
  if (!products || !products[0] || !products[1] || !products[2]) return null

  const currency = await getStoreCurrency()
  const [firstProduct, secondProduct, thirdProduct] = products

  return (
    <section className="container grid gap-4 pb-4 md:grid-cols-6 md:grid-rows-2">
      <ThreeItemGridItem currency={currency} item={firstProduct as Product} priority size="full" />
      <ThreeItemGridItem currency={currency} item={secondProduct as Product} priority size="half" />
      <ThreeItemGridItem currency={currency} item={thirdProduct as Product} size="half" />
    </section>
  )
}
