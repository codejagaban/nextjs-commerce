import type { Metadata } from 'next'

import { AuthShell } from '@/components/auth/AuthShell'
import { ResetPasswordForm } from '@/components/forms/ResetPasswordForm'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import React, { Suspense } from 'react'

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Set a new password" subtitle="Choose a password you have not used before.">
      {/* useSearchParams reads the token, so the form needs a suspense boundary. */}
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  )
}

export const metadata: Metadata = {
  description: 'Choose a new password for your account.',
  openGraph: mergeOpenGraph({
    title: 'Set a new password',
    url: '/reset-password',
  }),
  // A reset link is single-use and personal; it has no business in an index.
  robots: { follow: false, index: false },
  title: 'Set a new password',
}
