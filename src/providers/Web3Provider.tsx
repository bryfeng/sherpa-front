import { ReactNode, useMemo } from 'react'
import { WagmiConfig, http, createConfig } from 'wagmi'
import { mainnet, polygon, arbitrum, optimism, base } from 'wagmi/chains'
import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { SolanaAdapter } from '@reown/appkit-adapter-solana'
import { solana } from '@reown/appkit/networks'

const projectId = (import.meta as any).env?.VITE_WALLETCONNECT_PROJECT_ID as string | undefined
const isTestEnv = ((import.meta as any).env?.MODE || '').toLowerCase() === 'test'

const wagmiChains = [mainnet, base, arbitrum, optimism, polygon] as const
const wagmiNetworks = [...wagmiChains] as any
const appKitNetworks = [...wagmiNetworks, solana] as any

const metadata = {
  name: 'Agentic Wallet',
  description: 'DeFi-focused chat interface',
  url: 'http://localhost:5173',
  icons: ['https://avatars.githubusercontent.com/u/37784886?s=200&v=4']
}

let wagmiConfig = createConfig({
  chains: wagmiChains,
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [polygon.id]: http(),
  },
})

if (projectId && !isTestEnv) {
  const wagmiAdapter = new WagmiAdapter({
    projectId,
    networks: wagmiNetworks,
    transports: {
      [mainnet.id]: http(),
      [base.id]: http(),
      [arbitrum.id]: http(),
      [optimism.id]: http(),
      [polygon.id]: http(),
    },
    ssr: false,
  })
  const solanaAdapter = new SolanaAdapter()

  createAppKit({
    adapters: [wagmiAdapter, solanaAdapter],
    projectId,
    metadata,
    networks: appKitNetworks,
  })

  wagmiConfig = wagmiAdapter.wagmiConfig as any
}

export function Web3Provider({ children }: { children: ReactNode }) {
  const cfg = useMemo(() => wagmiConfig, [])
  return <WagmiConfig config={cfg}>{children}</WagmiConfig>
}
