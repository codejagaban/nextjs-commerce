import type { Metadata } from 'next'

import { RenderParams } from '@/components/RenderParams'
import { AuthShell } from '@/components/auth/AuthShell'
import React from 'react'

import { headers as getHeaders } from 'next/headers'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { LoginForm } from '@/components/forms/LoginForm'
import { redirect } from 'next/navigation'
import { getSettings } from '@/utilities/getSettings'
import { DEFAULT_STORE_NAME } from '@/brand'
import { noIndex } from '@/utilities/noIndex'

export default async function Login() {
  const headers = await getHeaders()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers })
  const settings = await getSettings()

  if (user) {
    redirect(`/account?warning=${encodeURIComponent('You are already logged in.')}`)
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to track your orders, save your addresses and check out faster."
    >
      <RenderParams />
      <LoginForm storeName={settings?.storeName || DEFAULT_STORE_NAME} />
    </AuthShell>
  )
}

export const metadata: Metadata = {
  robots: noIndex,
  description: 'Login or create an account to get started.',
  openGraph: {
    title: 'Login',
    url: '/login',
  },
  title: 'Login',
}
