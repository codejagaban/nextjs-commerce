import clsx from 'clsx'
import React from 'react'

/**
 * The default mark: a sun rising over a horizon — sol over mar, for the demo
 * brand. Replace this SVG to rebrand; everything else reads Store settings.
 * Two-tone (amber sun + ink horizon) via CSS custom properties, so it adapts
 * to light/dark automatically. Bespoke geometry, no icon-pack default.
 */
export function SunMark(props: React.ComponentProps<'svg'>) {
  return (
    <svg
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
      className={clsx('h-7 w-7', props.className)}
    >
      <g
        stroke="var(--amber)"
        strokeWidth="1.6"
        strokeLinecap="round"
        style={{ stroke: 'var(--amber)' }}
      >
        <line x1="16" y1="8.5" x2="16" y2="4.5" />
        <line x1="22.7" y1="14.3" x2="24.8" y2="12.2" />
        <line x1="9.3" y1="14.3" x2="7.2" y2="12.2" />
        <line x1="25.2" y1="18.5" x2="28.1" y2="17.8" />
        <line x1="6.8" y1="18.5" x2="3.9" y2="17.8" />
      </g>
      {/* rising half-sun */}
      <path d="M8 21 A8 8 0 0 1 24 21 Z" style={{ fill: 'var(--amber)' }} />
      {/* horizon (sea line) */}
      <line
        x1="3"
        y1="21"
        x2="29"
        y2="21"
        strokeWidth="2"
        strokeLinecap="round"
        style={{ stroke: 'var(--foreground)' }}
      />
    </svg>
  )
}

type LogoProps = {
  className?: string
  /** 'full' shows the sun mark + wordmark; 'mark' shows just the sun. */
  variant?: 'full' | 'mark'
  wordmarkClassName?: string
}

export function StoreLogo({
  className,
  storeName,
  variant = 'full',
  wordmarkClassName,
}: LogoProps & { storeName: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-2.5', className)}>
      <SunMark className="h-7 w-7 shrink-0" />
      {variant === 'full' ? (
        <span
          className={clsx(
            'font-display text-[1.35rem] leading-none tracking-[0.02em] text-foreground',
            wordmarkClassName,
          )}
        >
          {storeName}
        </span>
      ) : null}
    </span>
  )
}
