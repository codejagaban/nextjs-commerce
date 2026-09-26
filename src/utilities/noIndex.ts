import type { Metadata } from 'next'

export const noIndex: Metadata['robots'] = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false },
}
