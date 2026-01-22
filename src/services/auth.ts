import axios from 'axios'
import type { AuthChainId, StoredAuthSession } from './authStorage'

const BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000'

export interface NonceResponse {
  nonce: string
  expires_at: string
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  expires_at: string
  wallet_address: string
  chain_id: AuthChainId
  scopes: string[]
}

export function buildEvmSignInMessage(params: {
  domain: string
  address: string
  nonce: string
  chainId: number
  statement?: string
  uri?: string
}) {
  const issuedAt = new Date().toISOString()
  const statement = params.statement ?? 'Sign in to Sherpa.'
  const uri = params.uri ?? `https://${params.domain}`

  return [
    `${params.domain} wants you to sign in with your Ethereum account:`,
    params.address,
    '',
    statement,
    '',
    `URI: ${uri}`,
    'Version: 1',
    `Chain ID: ${params.chainId}`,
    `Nonce: ${params.nonce}`,
    `Issued At: ${issuedAt}`,
  ].join('\n')
}

export function buildSolanaSignInMessage(params: {
  domain: string
  address: string
  nonce: string
  statement?: string
  uri?: string
}) {
  const issuedAt = new Date().toISOString()
  const statement = params.statement ?? 'Sign in to Sherpa.'
  const uri = params.uri ?? `https://${params.domain}`

  return [
    `${params.domain} wants you to sign in with your Solana account:`,
    params.address,
    '',
    statement,
    '',
    `URI: ${uri}`,
    'Version: 1',
    'Chain ID: solana',
    `Nonce: ${params.nonce}`,
    `Issued At: ${issuedAt}`,
  ].join('\n')
}

export async function requestNonce(walletAddress: string, chain: string): Promise<NonceResponse> {
  const { data } = await axios.post(`${BASE}/auth/nonce`, {
    wallet_address: walletAddress,
    chain,
  })
  return data as NonceResponse
}

export async function verifyWalletSignature(payload: {
  message: string
  signature: string
  chain: string
}): Promise<StoredAuthSession> {
  const { data } = await axios.post(`${BASE}/auth/verify`, payload)
  const response = data as AuthResponse
  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    expiresAt: response.expires_at,
    walletAddress: response.wallet_address,
    chainId: response.chain_id,
  }
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  return btoa(binary)
}
