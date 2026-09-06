import { Categories } from '@/components/layout/search/Categories'
import { FilterItemDropdown } from '@/components/layout/search/filter/FilterItemDropdown'
import { sorting } from '@/lib/constants'
import { Search } from '@/components/Search'
import React, { Suspense } from 'react'

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <div className="container my-16 pb-4">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:gap-10">
          <aside className="w-full flex-none md:basis-1/5">
            <Categories />
          </aside>
          <div className="min-h-screen w-full">
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Search className="flex-1" />
              <div className="sm:flex-none">
                <Suspense fallback={null}>
                  <FilterItemDropdown list={sorting} />
                </Suspense>
              </div>
            </div>
            {children}
          </div>
        </div>
      </div>
    </Suspense>
  )
}
