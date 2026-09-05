import { cn } from '@/utilities/cn'
import React from 'react'

export function OpenCartButton({
  className,
  quantity,
  ...rest
}: {
  className?: string
  quantity?: number
}) {
  return (
    <button
      type="button"
      aria-label={quantity ? `Open cart, ${quantity} items` : 'Open cart'}
      className={cn('relative inline-flex items-center transition-opacity hover:opacity-70', className)}
      {...rest}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 7h12l-1 13H7L6 7z" />
        <path d="M9 7a3 3 0 0 1 6 0" />
      </svg>
      {quantity ? (
        <span className="absolute -right-2 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium leading-none text-primary-foreground tabular-nums">
          {quantity}
        </span>
      ) : null}
    </button>
  )
}
