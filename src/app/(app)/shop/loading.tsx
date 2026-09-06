import React from 'react'

/**
 * Placeholder for the product grid.
 *
 * It has to reserve the same vertical space the real grid will occupy — the
 * previous version used empty divs with no height, so the grid collapsed to
 * nothing and the footer rode up under the header until the products arrived.
 * Each tile mirrors ProductGridItem: a 4/5 image, then title, price and action.
 */
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading products…</span>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div className="flex flex-col" key={i}>
            <div className="aspect-[4/5] w-full animate-pulse rounded-2xl bg-secondary" />
            <div className="mt-4 h-4 w-3/5 animate-pulse rounded-full bg-secondary" />
            <div className="mt-2 h-4 w-1/4 animate-pulse rounded-full bg-secondary" />
            <div className="mt-3 h-9 w-28 animate-pulse rounded-full bg-secondary" />
          </div>
        ))}
      </div>
    </div>
  )
}
