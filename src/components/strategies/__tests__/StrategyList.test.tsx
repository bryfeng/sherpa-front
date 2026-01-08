import { render, screen } from '@testing-library/react'
import { StrategyList } from '../StrategyList'
import type { DCAStrategy, StrategyFilters } from '../../../types/strategy'

const mockStrategy: DCAStrategy = {
  _id: 'test-123' as any,
  _creationTime: Date.now(),
  userId: 'user-1' as any,
  walletId: 'wallet-1' as any,
  walletAddress: '0x1234567890abcdef',
  name: 'Test DCA Strategy',
  description: 'Buy ETH weekly',
  fromToken: {
    symbol: 'USDC',
    address: '0xusdc',
    decimals: 6,
    chainId: 1,
  },
  toToken: {
    symbol: 'ETH',
    address: '0xeth',
    decimals: 18,
    chainId: 1,
  },
  amountPerExecutionUsd: 100,
  frequency: 'weekly',
  executionHourUtc: 12,
  executionDayOfWeek: 1,
  maxSlippageBps: 50,
  maxGasUsd: 10,
  status: 'active',
  totalAmountSpentUsd: 500,
  totalTokensAcquired: '0.25',
  totalExecutions: 5,
  successfulExecutions: 5,
  failedExecutions: 0,
  averagePriceUsd: 2000,
  createdAt: Date.now(),
  updatedAt: Date.now(),
}

const defaultFilters: StrategyFilters = {
  status: 'all',
  sortBy: 'created',
  sortOrder: 'desc',
}

describe('StrategyList', () => {
  const defaultProps = {
    strategies: [mockStrategy],
    isLoading: false,
    isEmpty: false,
    filters: defaultFilters,
    onFiltersChange: vi.fn(),
    onCreateNew: vi.fn(),
    onPause: vi.fn(),
    onResume: vi.fn(),
    onStop: vi.fn(),
    onEdit: vi.fn(),
    onViewDetails: vi.fn(),
  }

  it('renders strategies', () => {
    render(<StrategyList {...defaultProps} />)
    expect(screen.getByText('Test DCA Strategy')).toBeInTheDocument()
  })

  it('renders empty state when no strategies', () => {
    render(<StrategyList {...defaultProps} strategies={[]} isEmpty={true} />)
    expect(screen.getByText('No strategies yet')).toBeInTheDocument()
    expect(screen.getByText('Create Strategy')).toBeInTheDocument()
  })

  it('renders loading skeletons when loading', () => {
    const { container } = render(<StrategyList {...defaultProps} isLoading={true} strategies={[]} />)
    // Loading state shows skeleton cards with pulse animation
    const skeletons = container.querySelectorAll('[class*="animate"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders search input', () => {
    render(<StrategyList {...defaultProps} />)
    expect(screen.getByPlaceholderText('Search strategies...')).toBeInTheDocument()
  })

  it('renders status filter', () => {
    render(<StrategyList {...defaultProps} />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })
})
