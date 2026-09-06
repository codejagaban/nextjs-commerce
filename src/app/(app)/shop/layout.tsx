import { Categories } from '@/components/layout/search/Categories'
import { FilterList } from '@/components/layout/search/filter'
import { sorting } from '@/lib/constants'
import { Search } from '@/components/Search'
import React, { Suspense } from 'react'

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <div className="container my-16 pb-4">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:gap-10">
          <aside className="flex w-full flex-none flex-col gap-8 md:basis-1/5">
            <Categories />
            <FilterList list={sorting} title="Sort by" />
          </aside>
          <div className="min-h-screen w-full">
            <Search className="mb-8" />
            {children}
          </div>
        </div>
      </div>
    </Suspense>
  )
}
