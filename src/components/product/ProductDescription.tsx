'use client'
import type { Product, Variant } from '@/payload-types'

import { RichText } from '@/components/RichText'
import { AddToCart } from '@/components/Cart/AddToCart'
import { Price } from '@/components/Price'
import React, { Suspense } from 'react'

import { ProductPrice } from './ProductPrice'
import { VariantSelector } from './VariantSelector'
import { useCurrency } from '@payloadcms/plugin-ecommerce/client/react'
import { StockIndicator } from '@/components/product/StockIndicator'

export function ProductDescription({ product }: { product: Product }) {
  const { currency } = useCurrency()
  let amount = 0,
    lowestAmount = 0,
    highestAmount = 0
  const priceField = `priceIn${currency.code}` as keyof Product
  const hasVariants = product.enableVariants && Boolean(product.variants?.docs?.length)

  if (hasVariants) {
    const priceField = `priceIn${currency.code}` as keyof Variant
    const variantsOrderedByPrice = product.variants?.docs
      ?.filter((variant) => variant && typeof variant === 'object')
      .sort((a, b) => {
        if (
          typeof a === 'object' &&
          typeof b === 'object' &&
          priceField in a &&
          priceField in b &&
          typeof a[priceField] === 'number' &&
          typeof b[priceField] === 'number'
        ) {
          return a[priceField] - b[priceField]
        }

        return 0
      }) as Variant[]

    const lowestVariant = variantsOrderedByPrice[0][priceField]
    const highestVariant = variantsOrderedByPrice[variantsOrderedByPrice.length - 1][priceField]
    if (
      variantsOrderedByPrice &&
      typeof lowestVariant === 'number' &&
      typeof highestVariant === 'number'
    ) {
      lowestAmount = lowestVariant
      highestAmount = highestVariant
    }
  } else if (product[priceField] && typeof product[priceField] === 'number') {
    amount = product[priceField]
  }

  return (
    <div className="flex flex-col">
      <h1 className="font-display text-3xl leading-tight text-foreground md:text-4xl">
        {product.title}
      </h1>
      <div className="mt-3 text-xl text-foreground tabular-nums">
        {hasVariants ? (
          <Suspense fallback={<Price highestAmount={highestAmount} lowestAmount={lowestAmount} />}>
            <ProductPrice
              product={product}
              highestAmount={highestAmount}
              lowestAmount={lowestAmount}
            />
          </Suspense>
        ) : (
          <Price amount={amount} />
        )}
      </div>

      {product.description ? (
        <RichText
          className="mt-6 max-w-prose text-muted-foreground"
          data={product.description}
          enableGutter={false}
        />
      ) : null}

      {hasVariants && (
        <div className="mt-8 border-t border-border/70 pt-8">
          <Suspense fallback={null}>
            <VariantSelector product={product} />
          </Suspense>
        </div>
      )}

      <div className="mt-8 border-t border-border/70 pt-8">
        <Suspense fallback={null}>
          <StockIndicator product={product} />
        </Suspense>
        <div className="mt-4">
          <Suspense fallback={null}>
            <AddToCart product={product} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
