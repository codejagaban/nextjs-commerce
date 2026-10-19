import { afterEach, describe, expect, it, vi } from 'vitest'
import { getMediaURL } from '@/utilities/getMediaURL'

afterEach(() => vi.unstubAllEnvs())

describe('media URLs with private-IP image protection', () => {
  it('uses a local optimizer path only for this store’s media', () => {
    vi.stubEnv('NEXT_PUBLIC_SERVER_URL', 'http://localhost:3002')
    expect(getMediaURL('http://localhost:3002/api/media/file/serum.webp?v=2')).toBe(
      '/api/media/file/serum.webp?v=2',
    )
    expect(getMediaURL('/api/media/file/serum.webp')).toBe('/api/media/file/serum.webp')
  })

  it('preserves cloud URLs and does not treat other origins or API routes as local media', () => {
    vi.stubEnv('NEXT_PUBLIC_SERVER_URL', 'https://store.example')
    for (const url of [
      'https://media.example/serum.webp',
      'https://other.example/api/media/file/serum.webp',
      'https://store.example:444/api/media/file/serum.webp',
      'https://store.example/api/users',
    ]) {
      expect(getMediaURL(url)).toBe(url)
    }
  })
})
