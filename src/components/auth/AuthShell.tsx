import React from 'react'

type Props = {
  title: string
  subtitle?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
}

/** Centered card layout shared by the login / account / password / order-lookup pages. */
export function AuthShell({ title, subtitle, children, footer }: Props) {
  return (
    <div className="container flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-md">
        <div className="text-center">
          <h1 className="font-display text-3xl text-foreground">{title}</h1>
          {subtitle ? (
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-card p-6 sm:p-8">{children}</div>

        {footer ? (
          <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>
        ) : null}
      </div>
    </div>
  )
}
