'use client'

import { CaretDown } from '@phosphor-icons/react/dist/ssr'
import { usePathname, useSearchParams } from 'next/navigation'
import React, { useEffect, useRef, useState } from 'react'

import type { ListItem } from '.'

import { FilterItem } from './FilterItem'

export function FilterItemDropdown({ list }: { list: ListItem[] }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [active, setActive] = useState('')
  const [openSelect, setOpenSelect] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpenSelect(false)
      }
    }

    window.addEventListener('click', handleClickOutside)
    return () => window.removeEventListener('click', handleClickOutside)
  }, [])

  useEffect(() => {
    list.forEach((listItem: ListItem) => {
      if (
        ('path' in listItem && pathname === listItem.path) ||
        ('slug' in listItem && searchParams.get('sort') === listItem.slug)
      ) {
        setActive(listItem.title)
      }
    })
  }, [pathname, list, searchParams])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Sort products"
        className="flex h-14 w-full items-center justify-between gap-3 rounded-full border border-border bg-transparent px-6 text-sm text-foreground transition-colors hover:border-foreground/40 sm:w-56"
        onClick={() => {
          setOpenSelect(!openSelect)
        }}
      >
        <span className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Sort</span>
          <span>{active}</span>
        </span>
        <CaretDown className="h-4 w-4 text-muted-foreground" />
      </button>
      {openSelect && (
        <div
          className="absolute right-0 z-40 mt-2 w-56 rounded-xl border border-border bg-popover p-3 shadow-lg"
          onClick={() => {
            setOpenSelect(false)
          }}
        >
          {list.map((item: ListItem, i) => (
            <FilterItem item={item} key={i} />
          ))}
        </div>
      )}
    </div>
  )
}
