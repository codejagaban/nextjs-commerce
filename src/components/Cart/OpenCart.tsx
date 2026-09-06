import { cn } from '@/utilities/cn'
import React from 'react'
import { ShoppingCart } from '@phosphor-icons/react/dist/ssr'

export function OpenCartButton({
  className,
  quantity,
  bump,
  ...rest
}: {
  className?: string
  quantity?: number
  bump?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={quantity ? `Open cart, ${quantity} items` : 'Open cart'}
      className={cn('relative inline-flex items-center transition-opacity hover:opacity-70', className)}
      {...rest}
    >
      <ShoppingCart
        className={cn('h-6 w-6', bump && 'animate-cart-bump')}
        weight="light"
        aria-hidden="true"
      />
      {quantity ? (
        <span className="absolute -right-2 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium leading-none text-primary-foreground tabular-nums">
          {quantity}
        </span>
      ) : null}
    </button>
  )
}
