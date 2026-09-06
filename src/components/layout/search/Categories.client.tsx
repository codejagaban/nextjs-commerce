'use client'
import React, { useCallback, useMemo } from 'react'

import { Category } from '@/payload-types'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/utilities/cn'

type Props = {
  category: Category
}

export const CategoryItem: React.FC<Props> = ({ category }) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const slug = category.slug || String(category.id)

  const selected = useMemo(
    () => (searchParams.get('category')?.split(',').filter(Boolean) ?? []) as string[],
    [searchParams],
  )
  const isChecked = selected.includes(slug)

  const toggle = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    const next = isChecked ? selected.filter((s) => s !== slug) : [...selected, slug]

    if (next.length) {
      params.set('category', next.join(','))
    } else {
      params.delete('category')
    }

    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [isChecked, pathname, router, searchParams, selected, slug])

  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm">
      <Checkbox checked={isChecked} onCheckedChange={toggle} aria-label={category.title} />
      <span
        className={cn(
          'transition-colors',
          isChecked ? 'font-medium text-foreground' : 'text-muted-foreground',
        )}
      >
        {category.title}
      </span>
    </label>
  )
}
