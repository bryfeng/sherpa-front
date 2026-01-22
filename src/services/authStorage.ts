export const AUTH_STORAGE_KEY = 'sherpa.auth.session'

export type AuthChainId = number | 'solana'

export interface StoredAuthSession {
  accessToken: string
  refreshToken: string
  expiresAt: string
  walletAddress: string
  chainId: AuthChainId
}

export function loadAuthSession(): StoredAuthSession | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as StoredAuthSession
    if (!parsed?.accessToken || !parsed?.refreshToken || !parsed?.expiresAt) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function saveAuthSession(session: StoredAuthSession) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
}

export function clearAuthSession() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(AUTH_STORAGE_KEY)
}

export function isAuthSessionValid(session: StoredAuthSession | null, bufferMs = 60_000): boolean {
  if (!session?.expiresAt) return false
  const expiresAtMs = Date.parse(session.expiresAt)
  if (Number.isNaN(expiresAtMs)) return false
  return Date.now() + bufferMs < expiresAtMs
}

export function getAccessToken(): string | null {
  const session = loadAuthSession()
  if (!session) return null
  return isAuthSessionValid(session) ? session.accessToken : null
}
