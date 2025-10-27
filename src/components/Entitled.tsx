// TODO: Workstream 6 — Pro Gating (Entitlements)

import React from 'react'

import { useEntitlements } from '../hooks/useEntitlements'

type RequestSource = 'cta' | 'action'

type FallbackRenderer =
  | React.ReactNode
  | ((helpers: { requestProUpgrade?: (source: RequestSource) => void; source: RequestSource }) => React.ReactNode)

export interface EntitledProps {
  children: React.ReactNode
  fallback?: FallbackRenderer
  source?: RequestSource
}

export const Entitled: React.FC<EntitledProps> = ({ children, fallback, source = 'action' }) => {
  const { isPro, requestProUpgrade } = useEntitlements()

  if (isPro) {
    return <>{children}</>
  }

  if (typeof fallback === 'function') {
    return <>{fallback({ requestProUpgrade, source })}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  return (
    <button type="button" onClick={() => requestProUpgrade?.(source)}>
      Upgrade to Pro
    </button>
  )
}
