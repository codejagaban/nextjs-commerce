import type { Product, Variant } from '@/payload-types'

import Link from 'next/link'
import React from 'react'
import { Media } from '@/components/Media'
import { Price } from '@/components/Price'
import { QuickAddButton } from '@/components/QuickAddButton'

type Props = {
  product: Partial<Product>
  priority?: boolean
  /** soft pastel tile background, cycled by the grid for variety */
  tile?: string
}

function Stars() {
  return (
    <span className="inline-flex items-center gap-0.5 text-terracotta" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 20 20" className="h-3 w-3 fill-current">
          <path d="M10 1.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L10 15l-5.3 2.6 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
        </svg>
      ))}
    </span>
  )
}

export const ProductGridItem: React.FC<Props> = ({ product, priority, tile }) => {
  const { gallery, priceInUSD, title, enableVariants } = product

  let price = priceInUSD
  const variants = product.variants?.docs as Variant[] | undefined
  if (variants && variants.length > 0) {
    const prices = variants
      .map((v) => (typeof v === 'object' ? v?.priceInUSD : undefined))
      .filter((n): n is number => typeof n === 'number')
    if (prices.length) price = Math.min(...prices)
  }

  const image =
    gallery?.[0]?.image && typeof gallery[0]?.image !== 'string' ? gallery[0]?.image : false

  return (
    <div className="group flex flex-col">
      <Link href={`/products/${product.slug}`} className="block">
        <div
          className="relative aspect-[4/5] overflow-hidden rounded-2xl"
          style={{ backgroundColor: tile ? `var(--${tile})` : 'var(--secondary)' }}
        >
          {image ? (
            <Media
              fill
              imgClassName="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
              priority={priority}
              resource={image}
              size="(min-width: 1024px) 24vw, (min-width: 640px) 45vw, 90vw"
            />
          ) : null}
        </div>
        <h3 className="mt-4 font-display text-lg leading-snug text-foreground">{title}</h3>
        {typeof price === 'number' && (
          <p className="mt-1 text-sm text-muted-foreground tabular-nums">
            {enableVariants ? <span className="mr-1 text-xs">from</span> : null}
            <Price amount={price} as="span" className="text-foreground" />
          </p>
        )}
      </Link>

      <div className="mt-3 flex items-center justify-between gap-3">
        <QuickAddButton
          productId={product.id!}
          hasVariants={Boolean(enableVariants)}
          slug={product.slug}
        />
        <Stars />
      </div>
    </div>
  )
}
