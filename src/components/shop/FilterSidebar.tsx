import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'

import { Facet, type FacetOption } from './Facet'

type Ref = { slug?: string | null; title?: string | null; group?: string | null } | string | number

const slugOf = (r: Ref) => (r && typeof r === 'object' ? r.slug ?? null : null)

export async function FilterSidebar() {
  const payload = await getPayload({ config: configPromise })

  const [categoriesRes, tagsRes, productsRes] = await Promise.all([
    payload.find({ collection: 'categories', sort: 'title', limit: 200, depth: 0 }),
    payload.find({ collection: 'tags', limit: 200, depth: 0 }),
    payload.find({
      collection: 'products',
      draft: false,
      overrideAccess: false,
      limit: 1000,
      pagination: false,
      depth: 1,
      where: { _status: { equals: 'published' } },
      select: { categories: true, tags: true },
    }),
  ])

  // Count how many products carry each category / tag.
  const catCount: Record<string, number> = {}
  const tagCount: Record<string, number> = {}
  for (const p of productsRes.docs as any[]) {
    for (const c of (p.categories as Ref[]) ?? []) {
      const s = slugOf(c)
      if (s) catCount[s] = (catCount[s] ?? 0) + 1
    }
    for (const t of (p.tags as Ref[]) ?? []) {
      const s = slugOf(t)
      if (s) tagCount[s] = (tagCount[s] ?? 0) + 1
    }
  }

  const categoryOptions: FacetOption[] = (categoriesRes.docs as any[])
    .map((c) => ({ label: c.title as string, value: c.slug as string, count: catCount[c.slug] ?? 0 }))
    .filter((o) => o.count > 0)

  // Group tags by their `group` field, preserving first-seen order.
  const groupOrder: string[] = []
  const tagGroups: Record<string, FacetOption[]> = {}
  for (const t of tagsRes.docs as any[]) {
    const group = (t.group as string) || 'Tags'
    const count = tagCount[t.slug] ?? 0
    if (count === 0) continue
    if (!tagGroups[group]) {
      tagGroups[group] = []
      groupOrder.push(group)
    }
    tagGroups[group].push({ label: t.title as string, value: t.slug as string, count })
  }

  return (
    <div>
      <h2 className="mb-6 font-display text-2xl text-foreground">Filter</h2>
      <div className="space-y-5">
        <Facet title="Category" paramKey="category" options={categoryOptions} />
        {groupOrder.map((group) => (
          <Facet key={group} title={group} paramKey="tag" options={tagGroups[group]} />
        ))}
      </div>
    </div>
  )
}
