import React from 'react'

/**
 * Dashboard icons.
 *
 * Same house as the sidebar marks — 24px grid, 1.6 stroke, round caps and joins —
 * so the admin reads as one drawn set rather than two. They take `currentColor`,
 * so they follow whatever ink sits beside them in either theme.
 */

type Props = React.ComponentProps<'svg'>

const Icon: React.FC<Props> = ({ children, ...props }) => (
  <svg
    aria-hidden="true"
    fill="none"
    height="18"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={1.6}
    viewBox="0 0 24 24"
    width="18"
    {...props}
  >
    {children}
  </svg>
)

/** Revenue — a coin stack. */
export const IconRevenue: React.FC<Props> = (p) => (
  <Icon {...p}>
    <ellipse cx="12" cy="6.4" rx="7.2" ry="2.9" stroke="currentColor" />
    <path d="M4.8 6.4v5.2c0 1.6 3.2 2.9 7.2 2.9s7.2-1.3 7.2-2.9V6.4" stroke="currentColor" />
    <path d="M4.8 11.6v5.2c0 1.6 3.2 2.9 7.2 2.9s7.2-1.3 7.2-2.9v-5.2" stroke="currentColor" />
  </Icon>
)

/** Orders — a shopping bag. */
export const IconOrders: React.FC<Props> = (p) => (
  <Icon {...p}>
    <path d="M5.4 7.6h13.2l-1 11.2a1.8 1.8 0 0 1-1.8 1.6H8.2a1.8 1.8 0 0 1-1.8-1.6z" stroke="currentColor" />
    <path d="M9 9.4V7a3 3 0 0 1 6 0v2.4" stroke="currentColor" />
  </Icon>
)

/** Average order — a price tag. */
export const IconAverage: React.FC<Props> = (p) => (
  <Icon {...p}>
    <path d="M3.6 11.6V5.4a1.8 1.8 0 0 1 1.8-1.8h6.2l8.8 8.8-8 8z" stroke="currentColor" />
    <circle cx="8" cy="8" r="1.3" stroke="currentColor" />
  </Icon>
)

/** Products — a box. */
export const IconProducts: React.FC<Props> = (p) => (
  <Icon {...p}>
    <path d="M12 3.2l8.4 4.4-8.4 4.5-8.4-4.5z" stroke="currentColor" />
    <path d="M3.6 7.6v8.5l8.4 4.6 8.4-4.6V7.6" stroke="currentColor" />
    <path d="M12 12.1v8.6" stroke="currentColor" />
  </Icon>
)

/** Trend — a rising line. */
export const IconTrend: React.FC<Props> = (p) => (
  <Icon {...p}>
    <path d="M3.6 20.4V4.6" stroke="currentColor" />
    <path d="M3.6 20.4h16.8" stroke="currentColor" />
    <path d="M6.8 15.6l3.8-4.4 3.2 2.6 5.2-6" stroke="currentColor" />
  </Icon>
)

/** Best sellers — a rosette. */
export const IconPopular: React.FC<Props> = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="9.2" r="5.6" stroke="currentColor" />
    <path d="M8.6 13.8L7.4 20.6l4.6-2.4 4.6 2.4-1.2-6.8" stroke="currentColor" />
  </Icon>
)

/** Order health — a pulse. */
export const IconHealth: React.FC<Props> = (p) => (
  <Icon {...p}>
    <path d="M3.4 12h3.8l2-5 3.4 10 2.2-5h5.8" stroke="currentColor" />
  </Icon>
)

/** Low stock — a box with a warning. */
export const IconStock: React.FC<Props> = (p) => (
  <Icon {...p}>
    <path d="M4.4 8.2h15.2v10.4a1.8 1.8 0 0 1-1.8 1.8H6.2a1.8 1.8 0 0 1-1.8-1.8z" stroke="currentColor" />
    <path d="M3.4 4.6h17.2v3.6H3.4z" stroke="currentColor" />
    <path d="M12 11.4v3.2M12 17.4v.1" stroke="currentColor" />
  </Icon>
)
