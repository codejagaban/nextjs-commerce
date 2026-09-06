import clsx from 'clsx'
import React from 'react'

/**
 * Marisol's in-house marks.
 *
 * Every one is built from the same two primitives as the brand's sun mark — an
 * arc and a horizon line — so the set reads as one drawn family rather than an
 * icon pack. Stroke weight, cap and the horizon rule are shared deliberately.
 */

type MarkProps = React.ComponentProps<'svg'>

const stroke = {
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function Mark({ children, ...props }: MarkProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      aria-hidden="true"
      {...props}
      className={clsx('h-9 w-9', props.className)}
    >
      {children}
    </svg>
  )
}

/** Pure ingredients — a droplet cresting the horizon, drawn like the sun. */
export function MarkDroplet(props: MarkProps) {
  return (
    <Mark {...props}>
      <path
        d="M20 9c4.2 5 6.3 8.4 6.3 11.6A6.3 6.3 0 0 1 20 27a6.3 6.3 0 0 1-6.3-6.4C13.7 17.4 15.8 14 20 9Z"
        {...stroke}
      />
      <line x1="7" y1="32" x2="33" y2="32" {...stroke} strokeWidth={1.8} />
    </Mark>
  )
}

/** Dermatologist approved — the horizon arc closed into a shield. */
export function MarkTested(props: MarkProps) {
  return (
    <Mark {...props}>
      <path
        d="M20 8.5c3.1 2 6.2 3 9.3 3 0 8.8-3.1 14.2-9.3 16.9-6.2-2.7-9.3-8.1-9.3-16.9 3.1 0 6.2-1 9.3-3Z"
        {...stroke}
      />
      <path d="M16 18.6l3 3 5.2-5.6" {...stroke} />
      <line x1="7" y1="32" x2="33" y2="32" {...stroke} strokeWidth={1.8} />
    </Mark>
  )
}

/** Sustainable beauty — a leaf on the same arc as the rising sun. */
export function MarkLeaf(props: MarkProps) {
  return (
    <Mark {...props}>
      <path
        d="M28.5 10c0 9.2-5 14.1-13.2 14.1-2.2 0-3.6-.3-3.6-.3s-.7-8.9 4.1-12.1C20.2 8.8 28.5 10 28.5 10Z"
        {...stroke}
      />
      <path d="M12.4 27C15 21.6 18.9 17.9 24.2 15.3" {...stroke} />
      <line x1="7" y1="32" x2="33" y2="32" {...stroke} strokeWidth={1.8} />
    </Mark>
  )
}
