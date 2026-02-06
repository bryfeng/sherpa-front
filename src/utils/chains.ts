export const CHAIN_METADATA: Record<number, { name: string; nativeSymbol: string }> = {
  1: { name: 'Ethereum', nativeSymbol: 'ETH' },
  10: { name: 'Optimism', nativeSymbol: 'ETH' },
  25: { name: 'Cronos', nativeSymbol: 'CRO' },
  56: { name: 'BNB Smart Chain', nativeSymbol: 'BNB' },
  100: { name: 'Gnosis', nativeSymbol: 'xDAI' },
  137: { name: 'Polygon', nativeSymbol: 'MATIC' },
  250: { name: 'Fantom', nativeSymbol: 'FTM' },
  324: { name: 'zkSync Era', nativeSymbol: 'ETH' },
  8453: { name: 'Base', nativeSymbol: 'ETH' },
  42161: { name: 'Arbitrum', nativeSymbol: 'ETH' },
  42220: { name: 'Celo', nativeSymbol: 'CELO' },
  43114: { name: 'Avalanche', nativeSymbol: 'AVAX' },
  57073: { name: 'Ink', nativeSymbol: 'ETH' },
  84532: { name: 'Base Sepolia', nativeSymbol: 'ETH' },
}

export function getChainName(chainId?: number | null): string | null {
  if (!chainId) return null
  const meta = CHAIN_METADATA[chainId]
  return meta ? meta.name : `Chain ${chainId}`
}

export function getNativeSymbol(chainId?: number | null): string | null {
  if (!chainId) return null
  const meta = CHAIN_METADATA[chainId]
  return meta ? meta.nativeSymbol : null
}
