'use client'

import type { Product, Variant } from '@/payload-types'

import { Price } from '@/components/Price'
import { useCurrency } from '@payloadcms/plugin-ecommerce/client/react'
import { useSearchParams } from 'next/navigation'
import { useMemo } from 'react'

type Props = {
  product: Product
  /** Shown until a variant is picked, or when the picked one carries no price. */
  lowestAmount: number
  highestAmount: number
}

/**
 * Shows the selected variant's price, falling back to the product's range while
 * the shopper has not settled on one.
 */
export const ProductPrice: React.FC<Props> = ({ product, lowestAmount, highestAmount }) => {
  const searchParams = useSearchParams()
  const { currency } = useCurrency()

  const variants = useMemo(() => product.variants?.docs || [], [product.variants])

  const selectedAmount = useMemo(() => {
    const variantID = searchParams.get('variant')

    if (!variantID) return undefined

    const selected = variants.find(
      (variant) => typeof variant === 'object' && String(variant.id) === variantID,
    )

    if (!selected || typeof selected !== 'object') return undefined

    const priceField = `priceIn${currency.code}` as keyof Variant
    const price = selected[priceField]

    return typeof price === 'number' ? price : undefined
  }, [searchParams, variants, currency.code])

  if (typeof selectedAmount === 'number') {
    return <Price amount={selectedAmount} />
  }

  return <Price highestAmount={highestAmount} lowestAmount={lowestAmount} />
}
