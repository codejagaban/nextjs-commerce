import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { noIndex } from '@/utilities/noIndex'

export const metadata: Metadata = { robots: noIndex }

export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return children
}
