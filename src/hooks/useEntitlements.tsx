// TODO: Workstream 6 — Pro Gating (Entitlements)

import React from 'react'

type RequestSource = 'cta' | 'action'

type EntitlementsContextValue = {
  isPro: boolean
  requestProUpgrade?: (source: RequestSource) => void
}

const EntitlementsContext = React.createContext<EntitlementsContextValue | undefined>(undefined)

export interface EntitlementsProviderProps {
  value: EntitlementsContextValue
  children: React.ReactNode
}

export function EntitlementsProvider({ value, children }: EntitlementsProviderProps) {
  return <EntitlementsContext.Provider value={value}>{children}</EntitlementsContext.Provider>
}

export function useEntitlements() {
  const context = React.useContext(EntitlementsContext)
  if (!context) {
    return { isPro: false } as EntitlementsContextValue
  }
  return context
}
