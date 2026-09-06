import type { Metadata } from 'next'

import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import React from 'react'

import { ForgotPasswordForm } from '@/components/forms/ForgotPasswordForm'
import { AuthShell } from '@/components/auth/AuthShell'

export default async function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email and we'll send you a link to set a new password."
    >
      <ForgotPasswordForm />
    </AuthShell>
  )
}

export const metadata: Metadata = {
  description: 'Enter your email address to recover your password.',
  openGraph: mergeOpenGraph({
    title: 'Forgot Password',
    url: '/forgot-password',
  }),
  title: 'Forgot Password',
}
