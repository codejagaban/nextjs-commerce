import clsx from 'clsx'
import React from 'react'

type Props = {
  className?: string
  /** Height of the arc in px. Keep it shallow — this is a horizon, not a wave. */
  height?: number
  /** Flip so the arc crests downward, for a section handing off to the one above. */
  flip?: boolean
}

/**
 * The horizon: the store's bespoke section silhouette.
 *
 * Sections hand off along this shallow arc — the same curve as the rising sun in
 * the brand mark — instead of butting at a straight seam. It is painted in the
 * *incoming* section's colour via `currentColor`, so the two surfaces meet as one
 * continuous ground rather than two stacked bands.
 */
export function Horizon({ className, height = 72, flip = false }: Props) {
  return (
    <div
      aria-hidden="true"
      className={clsx('pointer-events-none relative w-full', className)}
      style={{ height }}
    >
      <svg
        viewBox="0 0 1440 72"
        preserveAspectRatio="none"
        className={clsx('absolute inset-0 h-full w-full', flip && 'rotate-180')}
        fill="currentColor"
      >
        <path d="M0 72h1440V30C1200 4 900 0 720 0S240 4 0 30v42Z" />
      </svg>
    </div>
  )
}
