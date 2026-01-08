import { render, screen } from '@testing-library/react'
import { StrategyCard } from '../StrategyCard'
import type { DCAStrategy } from '../../../types/strategy'

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

describe('StrategyCard', () => {
  const defaultProps = {
    strategy: mockStrategy,
    onPause: vi.fn(),
    onResume: vi.fn(),
    onStop: vi.fn(),
    onEdit: vi.fn(),
    onViewDetails: vi.fn(),
  }

  it('renders strategy name and token pair', () => {
    render(<StrategyCard {...defaultProps} />)
    expect(screen.getByText('Test DCA Strategy')).toBeInTheDocument()
    expect(screen.getByText('USDC → ETH')).toBeInTheDocument()
  })

  it('renders status badge', () => {
    render(<StrategyCard {...defaultProps} />)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('renders execution stats', () => {
    render(<StrategyCard {...defaultProps} />)
    // Amount and frequency are shown
    expect(screen.getByText(/\$100/)).toBeInTheDocument()
    expect(screen.getByText(/weekly/i)).toBeInTheDocument()
  })

  it('renders paused status correctly', () => {
    const pausedStrategy = { ...mockStrategy, status: 'paused' as const }
    render(<StrategyCard {...defaultProps} strategy={pausedStrategy} />)
    expect(screen.getByText('Paused')).toBeInTheDocument()
  })

  it('renders draft status correctly', () => {
    const draftStrategy = { ...mockStrategy, status: 'draft' as const }
    render(<StrategyCard {...defaultProps} strategy={draftStrategy} />)
    expect(screen.getByText('Draft')).toBeInTheDocument()
  })
})
