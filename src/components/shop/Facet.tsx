'use client'

import React, { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { CaretUp } from '@phosphor-icons/react/dist/ssr'

import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/utilities/cn'

export type FacetOption = { label: string; value: string; count: number }

type Props = {
  title: string
  /** URL search-param key this facet writes to (e.g. "category" or "tag") */
  paramKey: string
  options: FacetOption[]
}

export function Facet({ title, paramKey, options }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(true)

  const selected = (searchParams.get(paramKey)?.split(',').filter(Boolean) ?? []) as string[]

  const toggle = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value]

    if (next.length) params.set(paramKey, next.join(','))
    else params.delete(paramKey)

    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  if (!options.length) return null

  return (
    <div className="border-b border-border pb-5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-1 text-left"
        aria-expanded={open}
      >
        <span className="text-xs uppercase tracking-[0.14em] text-foreground">{title}</span>
        <CaretUp
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform duration-200',
            !open && 'rotate-180',
          )}
        />
      </button>

      {open ? (
        <ul className="mt-4 space-y-3">
          {options.map((o) => {
            const checked = selected.includes(o.value)
            return (
              <li key={o.value}>
                <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                  <Checkbox checked={checked} onCheckedChange={() => toggle(o.value)} aria-label={o.label} />
                  <span className={cn('transition-colors', checked ? 'text-foreground' : 'text-muted-foreground')}>
                    {o.label} <span className="text-muted-foreground/70">({o.count})</span>
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
