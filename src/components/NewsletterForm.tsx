'use client'

import React, { useState } from 'react'
import { toast } from 'sonner'

export function NewsletterForm() {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
          toast.error('Please enter a valid email.')
          return
        }
        setDone(true)
        toast.success("You're on the list. Check your inbox for the code.")
      }}
      className="mt-6 flex flex-col gap-3"
    >
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email"
        aria-label="Email"
        className="h-12 w-full rounded-full border border-border bg-background px-5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-foreground/40"
      />
      <button
        type="submit"
        disabled={done}
        className="h-12 w-full rounded-full bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85 disabled:opacity-60"
      >
        {done ? 'Subscribed' : 'Subscribe'}
      </button>
    </form>
  )
}
