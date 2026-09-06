'use client'
import React, { useCallback, useMemo } from 'react'

import { Category } from '@/payload-types'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import clsx from 'clsx'

type Props = {
  category: Category
}

export const CategoryItem: React.FC<Props> = ({ category }) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const slug = category.slug || String(category.id)

  const isActive = useMemo(() => {
    return searchParams.get('category') === slug
  }, [slug, searchParams])

  const setQuery = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())

    if (isActive) {
      params.delete('category')
    } else {
      params.set('category', slug)
    }

    const newParams = params.toString()

    router.push(newParams ? pathname + '?' + newParams : pathname)
  }, [slug, isActive, pathname, router, searchParams])

  return (
    <button
      onClick={() => setQuery()}
      className={clsx('cursor-pointer text-sm transition-colors', {
        'font-medium text-foreground': isActive,
        'text-muted-foreground hover:text-foreground': !isActive,
      })}
    >
      {category.title}
    </button>
  )
}
