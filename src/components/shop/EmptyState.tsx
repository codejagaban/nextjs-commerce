import Link from 'next/link'
import React from 'react'

type Category = { slug?: string | null; title?: string | null }

type Props = {
  /** The search term, if one is active. */
  searchValue?: string
  /** Active category/tag slugs, used to offer a filters-only reset. */
  activeFilters: string[]
  /** Real categories to offer as a way out. */
  suggestions: Category[]
  /** Href that keeps the filters but drops the search term. */
  clearSearchHref: string
  /** Href that keeps the search term but drops the filters. */
  clearFiltersHref: string
}

/**
 * What a shopper sees when nothing matches.
 *
 * A dead end needs a way out, so this always offers at least one route back to
 * products rather than leaving the grid blank. Aligned to the grid rather than
 * floated in the middle of the empty column.
 */
export const ShopEmptyState: React.FC<Props> = ({
  searchValue,
  activeFilters,
  suggestions,
  clearSearchHref,
  clearFiltersHref,
}) => {
  const hasSearch = Boolean(searchValue)
  const hasFilters = activeFilters.length > 0

  return (
    <div className="max-w-xl py-6">
      <h2 className="font-display text-2xl leading-snug text-foreground md:text-3xl">
        {hasSearch ? (
          <>
            Nothing matches <span className="text-terracotta">&ldquo;{searchValue}&rdquo;</span>
          </>
        ) : (
          'Nothing matches these filters'
        )}
      </h2>

      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        {hasSearch && hasFilters
          ? 'Your filters may be narrowing this too far. Try removing one, or search for something else.'
          : hasSearch
            ? 'Check the spelling, try a shorter word, or browse the full range below.'
            : 'Try removing a filter to widen the results.'}
      </p>

      <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
        {hasSearch && (
          <Link
            href={clearSearchHref}
            className="font-medium text-terracotta underline-offset-4 transition-colors hover:text-terracotta-deep"
          >
            Clear search
          </Link>
        )}
        {hasFilters && (
          <Link
            href={clearFiltersHref}
            className="font-medium text-terracotta underline-offset-4 transition-colors hover:text-terracotta-deep"
          >
            Clear filters
          </Link>
        )}
        <Link
          href="/shop"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          Browse all products
        </Link>
      </div>

      {suggestions.length > 0 && (
        <div className="mt-10 border-t border-border/70 pt-7">
          <p className="text-sm text-muted-foreground">Or start from a category</p>
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            {suggestions.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/shop?category=${c.slug}`}
                  className="font-display text-lg text-foreground transition-colors hover:text-terracotta"
                >
                  {c.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
