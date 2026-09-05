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
      className={cn(
        'inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground',
        className,
      )}
      {...rest}
    >
      <span>Cart</span>
      {quantity ? (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground tabular-nums">
          {quantity}
        </span>
      ) : null}
    </button>
  )
}
