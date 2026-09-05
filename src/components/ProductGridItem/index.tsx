import type { Product, Variant } from '@/payload-types'

import Link from 'next/link'
import React from 'react'
import { Media } from '@/components/Media'
import { Price } from '@/components/Price'

type Props = {
  product: Partial<Product>
  priority?: boolean
}

export const ProductGridItem: React.FC<Props> = ({ product, priority }) => {
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

  const category =
    Array.isArray(product.categories) &&
    product.categories[0] &&
    typeof product.categories[0] === 'object'
      ? product.categories[0].title
      : undefined

  return (
    <Link className="group block" href={`/products/${product.slug}`}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-border/70 bg-card">
        {image ? (
          <Media
            fill
            imgClassName="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.04]"
            priority={priority}
            resource={image}
            size="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
          />
        ) : null}
      </div>

      <div className="mt-4">
        {category ? <p className="text-xs text-muted-foreground">{category}</p> : null}
        <h3 className="mt-1 font-display text-lg leading-snug text-foreground line-clamp-2">
          {title}
        </h3>
        {typeof price === 'number' && (
          <p className="mt-1.5 flex items-baseline gap-1 text-sm text-muted-foreground tabular-nums">
            {enableVariants ? <span className="text-xs">From</span> : null}
            <Price amount={price} as="span" className="text-foreground" />
          </p>
        )}
      </div>
    </Link>
  )
}
