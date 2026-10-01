'use client'

import React from 'react'

import { AdminNavigationProgress } from '../AdminNavigationProgress'

import './shell.scss'
import './nav-icons.scss'
import './fields.scss'
import './media-grid.scss'

/**
 * Carries our admin stylesheet into the panel.
 *
 * Payload has no config key for custom CSS — styles reach the admin by being
 * imported from a component it renders. Registering this as a provider means the
 * sheet loads on every admin screen, including login.
 */
export const AdminStyles: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return <AdminNavigationProgress>{children}</AdminNavigationProgress>
}
