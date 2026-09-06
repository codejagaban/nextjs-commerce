'use client'

import { cn } from '@/utilities/cn'
import { createUrl } from '@/utilities/createUrl'
import { MagnifyingGlass } from '@phosphor-icons/react/dist/ssr'
import { useRouter, useSearchParams } from 'next/navigation'
import React from 'react'

type Props = {
  className?: string
}

export const Search: React.FC<Props> = ({ className }) => {
  const router = useRouter()
  const searchParams = useSearchParams()

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const val = e.target as HTMLFormElement
    const search = val.search as HTMLInputElement
    const newParams = new URLSearchParams(searchParams.toString())

    if (search.value) {
      newParams.set('q', search.value)
    } else {
      newParams.delete('q')
    }

    router.push(createUrl('/shop', newParams))
  }

  return (
    <form className={cn('relative w-full', className)} onSubmit={onSubmit}>
      <input
        autoComplete="off"
        className="h-14 w-full rounded-full border border-border bg-transparent px-6 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/40"
        defaultValue={searchParams?.get('q') || ''}
        key={searchParams?.get('q')}
        name="search"
        placeholder="Search for products..."
        type="text"
      />
      <button
        type="submit"
        aria-label="Search"
        className="absolute right-0 top-0 mr-5 flex h-full items-center text-muted-foreground transition-colors hover:text-foreground"
      >
        <MagnifyingGlass className="h-5 w-5" />
      </button>
    </form>
  )
}
