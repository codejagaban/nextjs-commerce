'use client'

import { FormError } from '@/components/forms/FormError'
import { FormItem } from '@/components/forms/FormItem'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/providers/Auth'
import React, { Fragment, useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import { sendOrderAccessEmail } from './sendOrderAccessEmail'
import {
  emailRules,
  requiredRule,
} from '@/components/forms/validation'

type FormData = {
  email: string
  orderID: string
}

type Props = {
  initialEmail?: string
}

export const FindOrderForm: React.FC<Props> = ({ initialEmail }) => {
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<FormData>({
    defaultValues: {
      email: initialEmail || user?.email,
    },
  })

  const onSubmit = useCallback(async (data: FormData) => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const result = await sendOrderAccessEmail({
        email: data.email,
        orderID: data.orderID,
      })

      if (result.success) {
        setSuccess(true)
      } else {
        setSubmitError(result.error || 'Something went wrong. Please try again.')
      }
    } catch {
      setSubmitError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  if (success) {
    return (
      <p className="text-center text-sm leading-relaxed text-muted-foreground">
        If an order matches that email and order ID, we&rsquo;ve sent you an email with a link to
        view its details.
      </p>
    )
  }

  return (
    <form noValidate className="flex flex-col gap-5" onSubmit={handleSubmit(onSubmit)}>
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
      <FormItem>
        <Label htmlFor="orderID">Order ID</Label>
        <Input
          id="orderID"
          {...register('orderID', {
            ...requiredRule('Order ID'),
          })}
          type="text"
        />
        {errors.orderID && <FormError message={errors.orderID.message} />}
      </FormItem>
      {submitError && <FormError message={submitError} />}
      <Button
        type="submit"
        className="h-12 w-full rounded-full"
        variant="default"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Sending…' : 'Find my order'}
      </Button>
    </form>
  )
}
