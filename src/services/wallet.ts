export async function connectWallet(): Promise<string | null> {
  const eth = (window as any).ethereum
  if (!eth || !eth.request) return null
  try {
    const accounts: string[] = await eth.request({ method: 'eth_requestAccounts' })
    if (accounts && accounts.length > 0) return accounts[0]
    return null
  } catch (e) {
    return null
  }
}

export function truncateAddress(addr: string, size = 4) {
  return addr ? `${addr.slice(0, 2 + size)}…${addr.slice(-size)}` : ''
}

type SolanaProvider = {
  isPhantom?: boolean
  isSolflare?: boolean
  isBackpack?: boolean
  signMessage?: (message: Uint8Array) => Promise<{ signature: Uint8Array } | Uint8Array>
  publicKey?: { toString?: () => string }
}

export function getSolanaProvider(): SolanaProvider | null {
  if (typeof window === 'undefined') return null
  const w = window as any
  const candidates: Array<SolanaProvider | undefined> = [
    w.solana,
    w.phantom?.solana,
    w.solflare,
    w.backpack?.solana,
    w.backpack,
  ]

  for (const provider of candidates) {
    if (provider?.signMessage) return provider
  }
  return null
}

export async function signSolanaMessage(message: string) {
  const provider = getSolanaProvider()
  if (!provider?.signMessage) {
    throw new Error('Solana wallet does not support message signing')
  }

  const encoded = new TextEncoder().encode(message)
  const result = await provider.signMessage(encoded)
  if (result instanceof Uint8Array) return result
  if (result && typeof result === 'object' && 'signature' in result) {
    return (result as { signature: Uint8Array }).signature
  }
  throw new Error('Unsupported Solana signature response')
}
