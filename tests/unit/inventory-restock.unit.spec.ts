import { describe, expect, it } from 'vitest'

import { inventoryTargetsFor } from '@/inventory/restockOrder'

describe('order inventory restocking', () => {
  it('combines duplicate product quantities', () => {
    expect(
      inventoryTargetsFor([
        { product: 3, quantity: 2 },
        { product: { id: 3 }, quantity: 1 },
      ] as never),
    ).toEqual([{ collection: 'products', id: 3, quantity: 3 }])
  })

  it('restores variant stock instead of its parent product', () => {
    expect(inventoryTargetsFor([{ product: 3, variant: { id: 7 }, quantity: 2 }] as never)).toEqual(
      [{ collection: 'variants', id: 7, quantity: 2 }],
    )
  })

  it('ignores malformed inventory rows', () => {
    expect(
      inventoryTargetsFor([
        { product: 3, quantity: 0 },
        { product: null, quantity: 1 },
        { product: 3, quantity: Number.NaN },
      ] as never),
    ).toEqual([])
  })
})
