import { describe, expect, it, vi } from 'vitest'
import type { APIRequestContext } from '@playwright/test'
import { resetLink, smokeConfig } from '../smoke/config'
import { cleanupRecords, listRecords } from '../smoke/records'

const env = {
  SMOKE_BASE_URL: 'https://shop.example',
  SMOKE_ADMIN_EMAIL: 'admin@example.com',
  SMOKE_ADMIN_PASSWORD: 'test-only-password',
  SMOKE_CUSTOMER_EMAIL: 'smoke@example.com',
  SMOKE_STRIPE_SECRET_KEY: 'sk_test_example',
  SMOKE_MEDIA_ORIGIN: 'https://media.example',
  SMOKE_IMAP_HOST: 'mail.example',
  SMOKE_IMAP_USER: 'smoke@example.com',
  SMOKE_IMAP_PASSWORD: 'test-only-password',
}

describe('smoke test boundaries', () => {
  it('rejects live payments before opening a browser', () => {
    expect(() => smokeConfig({ ...env, SMOKE_STRIPE_SECRET_KEY: 'sk_live_example' })).toThrow(
      'test secret key',
    )
  })
  it('requires explicit local opt-in and HTTPS for every hosted target', () => {
    expect(() => smokeConfig({ ...env, SMOKE_BASE_URL: 'http://localhost:3002' })).toThrow('HTTPS')
    expect(
      smokeConfig({ ...env, SMOKE_BASE_URL: 'http://localhost:3002', SMOKE_ALLOW_LOCALHOST: '1' })
        .baseURL,
    ).toBe('http://localhost:3002')
    expect(() =>
      smokeConfig({ ...env, SMOKE_BASE_URL: 'http://shop.example', SMOKE_ALLOW_LOCALHOST: '1' }),
    ).toThrow('HTTPS')
    expect(() => smokeConfig({ ...env, SMOKE_BASE_URL: 'https://shop.example/admin' })).toThrow(
      'HTTPS',
    )
  })
  it('does not quietly skip mailbox or cloud media verification', () => {
    expect(() => smokeConfig({ ...env, SMOKE_IMAP_PASSWORD: undefined })).toThrow(
      'SMOKE_IMAP_PASSWORD',
    )
    expect(() => smokeConfig({ ...env, SMOKE_MEDIA_ORIGIN: undefined })).toThrow(
      'SMOKE_MEDIA_ORIGIN',
    )
    expect(() => smokeConfig({ ...env, SMOKE_INBOX_URL: 'https://untrusted.example' })).toThrow(
      'local-only',
    )
  })
  it('rejects reset links pointing at another environment and missing tokens', () => {
    expect(() =>
      resetLink(
        '<a href="https://old.example/reset-password?token=secret">Reset</a>',
        env.SMOKE_BASE_URL,
      ),
    ).toThrow('this deployment')
    expect(() => resetLink('<a href="/reset-password">Reset</a>', env.SMOKE_BASE_URL)).toThrow(
      'this deployment',
    )
    expect(
      resetLink(
        '<a href="https://shop.example/reset-password?token=secret&amp;source=email">Reset</a>',
        env.SMOKE_BASE_URL,
      ).searchParams.get('token'),
    ).toBe('secret')
  })
})

const response = (status: number, body = {}) => ({
  ok: () => status < 400,
  status: () => status,
  json: async () => body,
})
const run = {
  email: 'smoke+unique@example.com',
  slug: 'commerce-smoke-unique',
  mediaName: 'commerce-smoke-unique.png',
}

describe('failure cleanup', () => {
  it('refuses to delete an unrelated record even if an API filter is ignored', async () => {
    const api = {
      get: vi.fn(async () =>
        response(200, { docs: [{ id: 99, email: 'real-customer@example.com' }] }),
      ),
      delete: vi.fn(),
    }
    await expect(cleanupRecords(api as unknown as APIRequestContext, run)).rejects.toThrow(
      'Customer lookup',
    )
    expect(api.delete).not.toHaveBeenCalled()
  })
  it('does not mistake a failed lookup or truncated result for an empty collection', async () => {
    const api = { get: vi.fn().mockResolvedValue(response(403)) } as unknown as APIRequestContext
    await expect(listRecords(api, 'orders', 'customer', 7)).rejects.toThrow('HTTP 403')
    vi.mocked(api.get).mockResolvedValue(response(200, { docs: [], hasNextPage: true }) as never)
    await expect(listRecords(api, 'orders', 'customer', 7)).rejects.toThrow('partial cleanup')
  })
  it('deletes only exact-run resources in dependency order and verifies removal', async () => {
    const removed = new Set<string>()
    const ids: Record<string, number> = {
      users: 7,
      orders: 8,
      transactions: 9,
      carts: 10,
      addresses: 11,
      products: 12,
      media: 13,
    }
    const api = {
      get: vi.fn(async (path: string) => {
        const url = new URL(path, env.SMOKE_BASE_URL)
        const [, , collection, id] = url.pathname.split('/')
        if (id) return response(removed.has(url.pathname) ? 404 : 200)
        const field =
          collection === 'users'
            ? 'email'
            : collection === 'products'
              ? 'slug'
              : collection === 'media'
                ? 'filename'
                : 'customer'
        const value =
          collection === 'users'
            ? run.email
            : collection === 'products'
              ? run.slug
              : collection === 'media'
                ? run.mediaName
                : '7'
        expect(url.searchParams.get(`where[${field}][equals]`)).toBe(value)
        return response(200, {
          docs: [{ id: ids[collection], [field]: field === 'customer' ? 7 : value }],
        })
      }),
      delete: vi.fn(async (path: string) => {
        removed.add(path)
        return response(200)
      }),
    }
    await cleanupRecords(api as unknown as APIRequestContext, run)
    expect([...removed]).toEqual([
      '/api/orders/8',
      '/api/transactions/9',
      '/api/carts/10',
      '/api/addresses/11',
      '/api/users/7',
      '/api/products/12',
      '/api/media/13',
    ])
  })
  it('preserves the customer and product anchors if a related deletion fails', async () => {
    const api = {
      get: vi.fn(async (path: string) =>
        response(200, {
          docs: path.startsWith('/api/users?')
            ? [{ id: 7, email: run.email }]
            : path.startsWith('/api/orders?')
              ? [{ id: 8, customer: 7 }]
              : [],
        }),
      ),
      delete: vi.fn(async () => response(500)),
    }
    await expect(cleanupRecords(api as unknown as APIRequestContext, run)).rejects.toThrow(
      'orders/8',
    )
    expect(api.delete.mock.calls).toHaveLength(1)
  })
})
