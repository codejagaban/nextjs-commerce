import type { CollectionBeforeChangeHook } from 'payload'

import type { Order } from '@/payload-types'

type InventoryTarget = {
  collection: 'products' | 'variants'
  id: number
  quantity: number
}

const relationshipID = (value: unknown): number | undefined => {
  const id = typeof value === 'object' && value !== null && 'id' in value ? value.id : value
  return typeof id === 'number' && Number.isFinite(id) ? id : undefined
}

export const inventoryTargetsFor = (items: Order['items']): InventoryTarget[] => {
  const totals = new Map<string, InventoryTarget>()

  for (const item of items ?? []) {
    const quantity = Number(item.quantity)
    if (!Number.isFinite(quantity) || quantity <= 0) continue

    const variantID = relationshipID(item.variant)
    const productID = relationshipID(item.product)
    const collection = variantID ? 'variants' : 'products'
    const id = variantID ?? productID
    if (!id) continue

    const key = `${collection}:${id}`
    const existing = totals.get(key)
    totals.set(key, {
      collection,
      id,
      quantity: quantity + (existing?.quantity ?? 0),
    })
  }

  return [...totals.values()]
}

/**
 * Cancel an unshipped paid order: restore stock once. A refund is a money
 * movement, not evidence of a physical return. Shipped goods need a returns ledger.
 */
export const restockTerminalOrder: CollectionBeforeChangeHook<Order> = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation !== 'update' || !originalDoc) {
    delete data.inventoryRestockedAt
    return data
  }

  // This is an internal audit marker, not merchant input. Preserve the stored
  // value unless this hook completes the inventory operation below.
  data.inventoryRestockedAt = originalDoc.inventoryRestockedAt

  const nextStatus = data.orderStatus ?? originalDoc.orderStatus
  if (
    nextStatus !== 'cancelled' ||
    originalDoc.orderStatus === 'cancelled' ||
    originalDoc.inventoryRestockedAt
  ) {
    return data
  }

  if (!['unfulfilled', 'preparing'].includes(originalDoc.fulfillmentStatus ?? 'unfulfilled')) {
    throw new Error('Shipped orders must go through a return, not cancellation restocking.')
  }

  const transactionIDs = (originalDoc.transactions ?? [])
    .map(relationshipID)
    .filter((id): id is number => id !== undefined)
  if (!transactionIDs.length) return data

  const paidTransactions = await req.payload.find({
    collection: 'transactions',
    depth: 0,
    limit: 1,
    pagination: false,
    req,
    where: {
      and: [{ id: { in: transactionIDs } }, { status: { in: ['succeeded', 'refunded'] } }],
    },
  })
  if (!paidTransactions.docs.length) return data

  const targets = inventoryTargetsFor(originalDoc.items)
  if (!targets.length) throw new Error('A paid order has no valid inventory items to restore.')

  const restoredAt = new Date().toISOString()
  const claimed = await req.payload.db.updateOne({
    collection: 'orders',
    data: { inventoryRestockedAt: restoredAt },
    options: { atomic: true },
    req,
    where: {
      and: [{ id: { equals: originalDoc.id } }, { inventoryRestockedAt: { equals: null } }],
    },
  })
  if (!claimed) {
    const winner = await req.payload.findByID({
      collection: 'orders',
      depth: 0,
      id: originalDoc.id,
      req,
      select: { inventoryRestockedAt: true },
    })
    data.inventoryRestockedAt = winner.inventoryRestockedAt
    return data
  }

  for (const target of targets) {
    const updated = await req.payload.db.updateOne({
      collection: target.collection,
      data: { inventory: { $inc: target.quantity } },
      id: target.id,
      req,
    })
    if (!updated)
      throw new Error(`Could not restore inventory for ${target.collection} ${target.id}.`)
  }

  data.inventoryRestockedAt = restoredAt
  return data
}
