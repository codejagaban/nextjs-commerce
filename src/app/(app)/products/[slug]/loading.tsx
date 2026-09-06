import React from 'react'

/**
 * Placeholder for a product page. Mirrors the real two-column layout so the
 * footer stays put while the product loads instead of jumping down the page.
 */
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite" className="container py-10">
      <span className="sr-only">Loading product…</span>

      <div className="grid gap-10 md:grid-cols-2 md:gap-14">
        <div>
          <div className="aspect-[4/3] w-full animate-pulse rounded-2xl bg-secondary" />
          <div className="mt-4 flex gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div className="h-20 w-20 animate-pulse rounded-xl bg-secondary" key={i} />
            ))}
          </div>
        </div>

        <div className="flex flex-col">
          <div className="h-9 w-3/4 animate-pulse rounded-full bg-secondary" />
          <div className="mt-4 h-6 w-28 animate-pulse rounded-full bg-secondary" />
          <div className="mt-7 space-y-2">
            <div className="h-4 w-full animate-pulse rounded-full bg-secondary" />
            <div className="h-4 w-5/6 animate-pulse rounded-full bg-secondary" />
          </div>
          <div className="mt-9 h-4 w-16 animate-pulse rounded-full bg-secondary" />
          <div className="mt-4 flex gap-3">
            <div className="h-10 w-20 animate-pulse rounded-full bg-secondary" />
            <div className="h-10 w-20 animate-pulse rounded-full bg-secondary" />
          </div>
          <div className="mt-10 h-12 w-48 animate-pulse rounded-full bg-secondary" />
        </div>
      </div>
    </div>
  )
}
