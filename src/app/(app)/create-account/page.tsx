import type { Metadata } from 'next'

import { RenderParams } from '@/components/RenderParams'
import { AuthShell } from '@/components/auth/AuthShell'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import React from 'react'
import { headers as getHeaders } from 'next/headers'
import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { CreateAccountForm } from '@/components/forms/CreateAccountForm'
import { redirect } from 'next/navigation'
import { noIndex } from '@/utilities/noIndex'

export default async function CreateAccount() {
  const headers = await getHeaders()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers })

  if (user) {
    redirect(`/account?warning=${encodeURIComponent('You are already logged in.')}`)
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Save your details for faster checkout and to keep track of every order."
    >
      <RenderParams />
      <CreateAccountForm />
    </AuthShell>
  )
}

export const metadata: Metadata = {
  robots: noIndex,
  description: 'Create an account or log in to your existing account.',
  openGraph: mergeOpenGraph({
    title: 'Account',
    url: '/account',
  }),
  title: 'Account',
}
