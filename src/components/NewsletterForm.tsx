'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { emailRules } from '@/components/forms/validation'
import { FormError } from '@/components/forms/FormError'

type NewsletterValues = { email: string }

export function NewsletterForm() {
  const [done, setDone] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NewsletterValues>({ defaultValues: { email: '' } })

  const onSubmit = async () => {
    setDone(true)
    toast.success("You're on the list. Check your inbox for the code.")
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <input
          {...register('email', emailRules)}
          type="email"
          id="newsletter-email"
          placeholder="Your email"
          aria-label="Email"
          aria-invalid={errors.email ? 'true' : 'false'}
          disabled={done}
          className="h-12 w-full rounded-full border border-border bg-background px-5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-foreground/40 disabled:opacity-60 aria-[invalid=true]:border-error"
        />
        {errors.email && <FormError className="px-5" message={errors.email.message} />}
      </div>
      <button
        type="submit"
        disabled={done || isSubmitting}
        className="h-12 w-full rounded-full bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85 disabled:opacity-60"
      >
        {done ? 'Subscribed' : 'Subscribe'}
      </button>
    </form>
  )
}
