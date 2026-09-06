'use client'

import { useAuth } from '@/providers/Auth'
import { useEcommerce } from '@payloadcms/plugin-ecommerce/client/react'
import { useEffect, useRef } from 'react'

/**
 * Keeps the ecommerce plugin's session in step with the site's auth state.
 *
 * The plugin reads the customer once, when its provider mounts. Logging in or
 * out is a client-side navigation, so the provider never remounts and is left
 * holding the session it read on first paint — which is why saving an address
 * after logging in failed with "User must be logged in". Handing the login to
 * the plugin also lets it move a guest cart onto the customer's account.
 */
export const EcommerceSession = () => {
  const { user } = useAuth()
  const { onLogin, onLogout } = useEcommerce()
  const lastSyncedUserID = useRef<number | string | null | undefined>(undefined)

  useEffect(() => {
    // Undefined means the auth check has not resolved yet.
    if (user === undefined) return

    const userID = user?.id ?? null
    if (lastSyncedUserID.current === userID) return

    const previousUserID = lastSyncedUserID.current
    lastSyncedUserID.current = userID

    // First resolution after a full page load: the plugin reads the customer on
    // mount by itself, so there is nothing to reconcile.
    if (previousUserID === undefined) return

    if (userID) {
      void onLogin().catch(() => {
        // Let the plugin keep its current session; the next load will resync.
        lastSyncedUserID.current = previousUserID
      })
    } else {
      onLogout()
    }
  }, [user, onLogin, onLogout])

  return null
}
