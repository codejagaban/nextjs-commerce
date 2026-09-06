import type { Metadata } from 'next'

import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import React from 'react'
import { FindOrderForm } from '@/components/forms/FindOrderForm'
import { AuthShell } from '@/components/auth/AuthShell'
import { getPayload } from 'payload'
import { headers as getHeaders } from 'next/headers.js'
import configPromise from '@payload-config'

export default async function FindOrderPage() {
  const headers = await getHeaders()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers })

  return (
    <AuthShell
      title="Find my order"
      subtitle="Enter your email and order ID and we'll email you a link to view your order."
    >
      <FindOrderForm initialEmail={user?.email} />
    </AuthShell>
  )
}

export const metadata: Metadata = {
  description: 'Find your order using your email and order ID.',
  openGraph: mergeOpenGraph({
    title: 'Find order',
    url: '/find-order',
  }),
  title: 'Find order',
}
