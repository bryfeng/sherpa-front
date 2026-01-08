import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { App } from '../App'
import { Web3Provider } from '../providers/Web3Provider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock useAppKit hook from @reown/appkit
vi.mock('@reown/appkit/react', () => ({
  useAppKit: vi.fn(() => ({ open: vi.fn() })),
  useAppKitAccount: vi.fn(() => ({ address: undefined, isConnected: false })),
  useAppKitState: vi.fn(() => ({ open: false, selectedNetworkId: undefined })),
}))

// Mock Convex hooks
vi.mock('convex/react', () => ({
  useQuery: vi.fn(() => undefined),
  useMutation: vi.fn(() => vi.fn()),
  useConvex: vi.fn(() => ({})),
  ConvexProvider: ({ children }: { children: React.ReactNode }) => children,
}))

describe('App', () => {
  it('renders header', async () => {
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
    render(
      <QueryClientProvider client={client}>
        <Web3Provider>
          <App />
        </Web3Provider>
      </QueryClientProvider>
    )
    expect(await screen.findByText(/Sherpa AI workspace/i)).toBeInTheDocument()
  })
})
