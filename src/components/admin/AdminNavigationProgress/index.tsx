'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import './index.scss'

type ProgressContext = {
  start: () => void
}

const AdminNavigationProgressContext = createContext<ProgressContext>({ start: () => undefined })

export const useAdminNavigationProgress = () => useContext(AdminNavigationProgressContext)

export const AdminNavigationProgress: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [loadingFrom, setLoadingFrom] = useState<string | null>(null)
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigationKey = `${pathname}?${searchParams.toString()}`
  const isLoading = loadingFrom === navigationKey

  const start = useCallback(() => {
    if (safetyTimer.current) clearTimeout(safetyTimer.current)
    setLoadingFrom(navigationKey)
    safetyTimer.current = setTimeout(() => setLoadingFrom(null), 15_000)
  }, [navigationKey])
  const context = useMemo(() => ({ start }), [start])

  useEffect(() => () => {
    if (safetyTimer.current) clearTimeout(safetyTimer.current)
  }, [])

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }

      const target = event.target
      if (!(target instanceof Element)) return

      const anchor = target.closest<HTMLAnchorElement>('a[href]')
      if (!anchor || anchor.download || (anchor.target && anchor.target !== '_self')) return

      const destination = new URL(anchor.href, window.location.href)
      if (destination.origin !== window.location.origin || !destination.pathname.startsWith('/admin')) {
        return
      }

      const current = `${window.location.pathname}${window.location.search}`
      const next = `${destination.pathname}${destination.search}`
      if (next !== current) start()
    }

    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [start])

  return (
    <AdminNavigationProgressContext.Provider value={context}>
      {isLoading && (
        <div
          aria-label="Loading admin page"
          className="admin-navigation-progress"
          role="progressbar"
        >
          <span />
        </div>
      )}
      {children}
    </AdminNavigationProgressContext.Provider>
  )
}
