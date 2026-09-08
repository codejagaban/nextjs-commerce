'use client'

import { FormError } from '@/components/forms/FormError'
import { FormItem } from '@/components/forms/FormItem'
import { Message } from '@/components/Message'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/providers/Auth'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'

import { passwordConfirmRules, passwordRules } from '@/components/forms/validation'

type FormData = {
  password: string
  passwordConfirm: string
}

/**
 * Where the link in the reset email lands.
 *
 * Payload signs a token into that link and expects it back alongside the new
 * password. A successful reset also logs the person in, so there is no reason to
 * make them type the password they just chose a third time on the login page —
 * they go straight to their account.
 */
export const ResetPasswordForm: React.FC = () => {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const router = useRouter()
  const { resetPassword } = useAuth()

  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const {
    formState: { errors },
    getValues,
    handleSubmit,
    register,
  } = useForm<FormData>()

  const onSubmit = useCallback(
    async (data: FormData) => {
      if (!token) return
      setSubmitting(true)
      setError('')

      try {
        await resetPassword({
          password: data.password,
          passwordConfirm: data.passwordConfirm,
          token,
        })
        router.push('/account?reset=1')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
        setSubmitting(false)
      }
    },
    [resetPassword, router, token],
  )

  /**
   * A link opened without a token — hand-typed, or mangled by an email client
   * that broke the URL across lines. There is nothing to submit, so say so
   * rather than showing a form that cannot work.
   */
  if (!token) {
    return (
      <div className="text-center">
        <p className="text-sm leading-relaxed text-muted-foreground">
          This password reset link is missing its token. It may have been broken across lines by
          your email app — try opening it again, or request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="mt-4 inline-block text-sm font-medium text-foreground underline underline-offset-4"
        >
          Request a new link
        </Link>
      </div>
    )
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)}>
      <Message className="mb-5" error={error} />

      <div className="flex flex-col gap-5">
        <FormItem>
          <Label htmlFor="password">New password</Label>
          <Input
            autoComplete="new-password"
            id="password"
            {...register('password', passwordRules)}
            type="password"
          />
          {errors.password && <FormError message={errors.password.message} />}
        </FormItem>

        <FormItem>
          <Label htmlFor="passwordConfirm">Confirm new password</Label>
          <Input
            autoComplete="new-password"
            id="passwordConfirm"
            {...register('passwordConfirm', passwordConfirmRules(() => getValues('password')))}
            type="password"
          />
          {errors.passwordConfirm && <FormError message={errors.passwordConfirm.message} />}
        </FormItem>

        <Button
          className="h-12 w-full rounded-full"
          disabled={submitting}
          type="submit"
          variant="default"
        >
          {submitting ? 'Saving…' : 'Set new password'}
        </Button>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remembered it?{' '}
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
          Back to log in
        </Link>
      </p>
    </form>
  )
}
