export type EntitlementGating = 'token' | 'disabled' | 'manual' | 'error'

export interface EntitlementResponse {
  address: string
  chain: string
  pro: boolean
  gating: EntitlementGating
  standard?: string | null
  token_address?: string | null
  token_id?: string | null
  reason?: string | null
  checked_at: string
  cached: boolean
  metadata?: Record<string, unknown>
}

export interface EntitlementSnapshot {
  status: 'idle' | 'loading' | 'ready' | 'disabled' | 'error'
  pro: boolean
  gating?: EntitlementGating
  chain?: string | null
  standard?: string | null
  tokenAddress?: string | null
  tokenId?: string | null
  reason?: string | null
  checkedAt?: string | null
  metadata?: Record<string, unknown>
}
