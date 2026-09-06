'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

/**
 * A "Dashboard" entry at the top of the sidebar.
 *
 * Payload builds its nav from collections and globals, so the admin home has no
 * link of its own — you get back to it through the logo. This gives it a name and
 * a place in the list. The id matches the pattern Payload uses for its own items
 * so it picks up an icon from the same stylesheet.
 */
export const DashboardNavLink: React.FC = () => {
  const pathname = usePathname()
  const isActive = pathname === '/admin'

  return (
    <div className="nav__group">
      <Link
        className={`nav__link${isActive ? ' active' : ''}`}
        href="/admin"
        id="nav-dashboard"
      >
        <span className="nav__link-label">Dashboard</span>
      </Link>
    </div>
  )
}
