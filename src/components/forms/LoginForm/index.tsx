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
import React, { useCallback } from 'react'
import { useForm } from 'react-hook-form'
import {
  emailRules,
  passwordSignInRules,
} from '@/components/forms/validation'

type FormData = {
  email: string
  password: string
}

export const LoginForm: React.FC<{ storeName: string }> = ({ storeName }) => {
  const searchParams = useSearchParams()
  const allParams = searchParams.toString() ? `?${searchParams.toString()}` : ''
  const redirect = searchParams.get('redirect')
  const { login } = useAuth()
  const router = useRouter()
  const [error, setError] = React.useState<null | string>(null)

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<FormData>()

  const onSubmit = useCallback(
    async (data: FormData) => {
      try {
        await login(data)
        if (redirect) router.push(redirect)
        else router.push('/account')
      } catch (_) {
        setError('There was an error with the credentials provided. Please try again.')
      }
    },
    [login, router, redirect],
  )

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)}>
      <Message error={error} />
      <div className="flex flex-col gap-5">
        <FormItem>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@email.com"
            {...register('email', emailRules)}
          />
          {errors.email && <FormError message={errors.email.message} />}
        </FormItem>

        <FormItem>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href={`/forgot-password${allParams}`}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            {...register('password', passwordSignInRules)}
          />
          {errors.password && <FormError message={errors.password.message} />}
        </FormItem>

        <Button
          className="h-12 w-full rounded-full"
          disabled={isSubmitting}
          type="submit"
          variant="default"
        >
          {isSubmitting ? 'Logging in…' : 'Log in'}
        </Button>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to {storeName}?{' '}
        <Link
          href={`/create-account${allParams}`}
          className="font-medium text-foreground underline underline-offset-4"
        >
          Create an account
        </Link>
      </p>
    </form>
  )
}
