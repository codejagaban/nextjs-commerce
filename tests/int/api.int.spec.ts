import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import type { User } from '@/payload-types'

let payload: Payload
let admin: User
let customer: User
let other: User
let productID: number
const prefix = randomUUID()
const password = 'CommerceTest123!'
const userIDs: number[] = []

describe('Commerce API and access controls', () => {
  beforeAll(async () => {
    const { default: config } = await import('@/payload.config')
    payload = await getPayload({ config })
    for (const role of ['admin', 'customer', 'customer'] as const) {
      const user = await payload.create({
        collection: 'users',
        data: {
          email: `${prefix}-${userIDs.length}@example.com`,
          password,
          roles: [role],
        },
      })
      userIDs.push(user.id)
      if (!admin) admin = user
      else if (!customer) customer = user
      else other = user
    }
    const product = await payload.create({
      collection: 'products',
      data: {
        title: `Regression ${prefix}`,
        slug: `regression-${prefix}`,
        _status: 'published',
        priceInUSDEnabled: true,
        priceInUSD: 2500,
        inventory: 5,
      },
    })
    productID = product.id
  })

  afterAll(async () => {
    if (!payload) return
    if (productID) {
      await payload.delete({
        collection: 'transactions',
        where: { 'items.product': { equals: productID } },
      })
      await payload.delete({ collection: 'products', id: productID })
    }
    for (const id of userIDs) await payload.delete({ collection: 'users', id })
    await payload.destroy()
  })

  it('logs a customer in without email verification', async () => {
    const result = await payload.login({
      collection: 'users',
      data: { email: customer.email, password },
    })
    expect(result.user?.id).toBe(customer.id)
    expect(result.token).toBeTruthy()
  })

  it('rejects incorrect credentials', async () => {
    await expect(
      payload.login({
        collection: 'users',
        data: {
          email: customer.email,
          password: 'WrongPassword123',
        },
      }),
    ).rejects.toThrow()
  })

  it('resets a password once and invalidates the old password and reset token', async () => {
    const token = await payload.forgotPassword({
      collection: 'users',
      data: { email: other.email },
      disableEmail: true,
    })
    expect(token).toBeTruthy()
    const newPassword = 'ChangedCommerce123!'
    const reset = await payload.resetPassword({
      collection: 'users',
      overrideAccess: false,
      data: { token: token!, password: newPassword },
    })
    expect(reset.user?.id).toBe(other.id)
    await expect(
      payload.login({ collection: 'users', data: { email: other.email, password } }),
    ).rejects.toThrow()
    const login = await payload.login({
      collection: 'users',
      data: { email: other.email, password: newPassword },
    })
    expect(login.user?.id).toBe(other.id)
    await expect(
      payload.resetPassword({
        collection: 'users',
        overrideAccess: false,
        data: { token: token!, password },
      }),
    ).rejects.toThrow()
  })

  it('limits a customer to their own user record', async () => {
    const result = await payload.find({
      collection: 'users',
      user: customer,
      overrideAccess: false,
    })
    expect(result.docs.map((doc) => doc.id)).toEqual([customer.id])
  })

  it('prevents customers from editing another account', async () => {
    await expect(
      payload.update({
        collection: 'users',
        id: other.id,
        user: customer,
        overrideAccess: false,
        data: { name: 'Unauthorized' },
      }),
    ).rejects.toThrow()
  })

  it('prevents self-promotion to admin', async () => {
    await payload.update({
      collection: 'users',
      id: customer.id,
      user: customer,
      overrideAccess: false,
      data: { roles: ['admin'] },
    })
    const result = await payload.findByID({ collection: 'users', id: customer.id })
    expect(result.roles).toEqual(['customer'])
  })

  it('allows admins to manage customers', async () => {
    const result = await payload.update({
      collection: 'users',
      id: other.id,
      user: admin,
      overrideAccess: false,
      data: { name: 'Updated customer' },
    })
    expect(result.name).toBe('Updated customer')
  })

  it('hides draft products from anonymous shoppers', async () => {
    await payload.update({ collection: 'products', id: productID, data: { _status: 'draft' } })
    const result = await payload.find({
      collection: 'products',
      overrideAccess: false,
      where: { id: { equals: productID } },
    })
    expect(result.docs).toHaveLength(0)
    await payload.update({ collection: 'products', id: productID, data: { _status: 'published' } })
  })

  it('creates separate transaction rows when payment initiation is retried', async () => {
    const cartRowID = randomUUID()
    const create = () =>
      payload.create({
        collection: 'transactions',
        data: {
          amount: 2500,
          currency: 'USD',
          customer: customer.id,
          status: 'pending',
          paymentMethod: 'stripe',
          items: [{ id: cartRowID, product: productID, quantity: 1 }],
        },
      })
    const first = await create()
    const second = await create()
    expect(first.items?.[0].id).toBeTruthy()
    expect(second.items?.[0].id).not.toBe(first.items?.[0].id)
    expect(first.items?.[0].id).not.toBe(cartRowID)
  })
})
