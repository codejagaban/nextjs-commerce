'use client'

import { useCart } from '@payloadcms/plugin-ecommerce/client/react'
import Link from 'next/link'
import React, { useState } from 'react'
import { toast } from 'sonner'
import { Check } from '@phosphor-icons/react/dist/ssr'

type Props = {
  productId: string | number
  variantId?: string | number
  hasVariants?: boolean
  slug?: string | null
  className?: string
}

const pill =
  'inline-flex h-9 items-center justify-center rounded-full bg-primary px-5 text-xs font-medium tracking-wide text-primary-foreground transition-colors hover:bg-primary/85 disabled:opacity-60'

/**
 * Skinelle-style card action. Simple products add straight to the cart; products
 * with variants send the shopper to the product page to choose options.
 */
export function QuickAddButton({ productId, variantId, hasVariants, slug, className }: Props) {
  const { addItem, isLoading } = useCart()
  const [busy, setBusy] = useState(false)
  const [justAdded, setJustAdded] = useState(false)

  if (hasVariants) {
    return (
      <Link href={`/products/${slug}`} className={`${pill} ${className ?? ''}`}>
        Choose options
      </Link>
    )
  }

  return (
    <button
      type="button"
      disabled={busy || isLoading}
      className={`${pill} ${className ?? ''}`}
      onClick={async (e) => {
        e.preventDefault()
        setBusy(true)
        try {
          await addItem({
            product: productId as any,
            variant: (variantId ?? undefined) as any,
          })
          toast.success('Added to cart')
          setJustAdded(true)
          setTimeout(() => setJustAdded(false), 1800)
        } catch {
          toast.error('Could not add to cart')
        } finally {
          setBusy(false)
        }
      }}
    >
      {justAdded ? (
        <span className="inline-flex items-center gap-1">
          <Check weight="bold" className="h-3.5 w-3.5" /> Added
        </span>
      ) : (
        'Add to cart'
      )}
    </button>
  )
}
