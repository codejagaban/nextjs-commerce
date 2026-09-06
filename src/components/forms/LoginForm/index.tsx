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
import React, { useCallback, useRef } from 'react'
import { useForm } from 'react-hook-form'

type FormData = {
  email: string
  password: string
}

export const LoginForm: React.FC = () => {
  const searchParams = useSearchParams()
  const allParams = searchParams.toString() ? `?${searchParams.toString()}` : ''
  const redirect = useRef(searchParams.get('redirect'))
  const { login } = useAuth()
  const router = useRouter()
  const [error, setError] = React.useState<null | string>(null)

  const {
    formState: { errors, isLoading },
    handleSubmit,
    register,
  } = useForm<FormData>()

  const onSubmit = useCallback(
    async (data: FormData) => {
      try {
        await login(data)
        if (redirect?.current) router.push(redirect.current)
        else router.push('/account')
      } catch (_) {
        setError('There was an error with the credentials provided. Please try again.')
      }
    },
    [login, router],
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Message error={error} />
      <div className="flex flex-col gap-5">
        <FormItem>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@email.com"
            {...register('email', { required: 'Email is required.' })}
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
            {...register('password', { required: 'Please provide a password.' })}
          />
          {errors.password && <FormError message={errors.password.message} />}
        </FormItem>

        <Button
          className="h-12 w-full rounded-full"
          disabled={isLoading}
          type="submit"
          variant="default"
        >
          {isLoading ? 'Logging in…' : 'Log in'}
        </Button>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to Marisol?{' '}
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
