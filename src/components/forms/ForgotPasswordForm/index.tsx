'use client'

import { FormError } from '@/components/forms/FormError'
import { FormItem } from '@/components/forms/FormItem'
import { Message } from '@/components/Message'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import React, { Fragment, useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  emailRules,
} from '@/components/forms/validation'

type FormData = {
  email: string
}

export const ForgotPasswordForm: React.FC = () => {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<FormData>()

  const onSubmit = useCallback(async (data: FormData) => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SERVER_URL}/api/users/forgot-password`,
      {
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      },
    )

    if (response.ok) {
      setSuccess(true)
      setError('')
    } else {
      setError(
        'There was a problem while attempting to send you a password reset email. Please try again.',
      )
    }
  }, [])

  return (
    <Fragment>
      {!success && (
        <form noValidate onSubmit={handleSubmit(onSubmit)}>
          <Message className="mb-5" error={error} />

          <div className="flex flex-col gap-5">
            <FormItem>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                placeholder="you@email.com"
                {...register('email', emailRules)}
                type="email"
              />
              {errors.email && <FormError message={errors.email.message} />}
            </FormItem>

            <Button className="h-12 w-full rounded-full" type="submit" variant="default">
              Send reset link
            </Button>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Remembered it?{' '}
            <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
              Back to log in
            </Link>
          </p>
        </form>
      )}
      {success && (
        <div className="text-center">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Check your email for a link to securely reset your password.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-block text-sm font-medium text-foreground underline underline-offset-4"
          >
            Back to log in
          </Link>
        </div>
      )}
    </Fragment>
  )
}
