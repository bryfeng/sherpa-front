import { render, screen } from '@testing-library/react'
import { StrategyCard } from '../StrategyCard'
import type { GenericStrategy } from '../../../hooks/useStrategies'

// Mock the formatNextExecution and formatLastExecution functions
vi.mock('../../../hooks/useStrategies', async (importOriginal) => {
  const actual = await importOriginal() as object
  return {
    ...actual,
    formatNextExecution: vi.fn(() => 'Next: Tomorrow'),
    formatLastExecution: vi.fn(() => 'Last: Yesterday'),
  }
})

const mockStrategy: GenericStrategy = {
  _id: 'test-123' as any,
  _creationTime: Date.now(),
  userId: 'user-1' as any,
  walletAddress: '0x1234567890abcdef',
  name: 'Test DCA Strategy',
  description: 'Buy ETH weekly',
  strategyType: 'dca',
  config: {
    amount_usd: 100,
    frequency: 'weekly',
    from_token: 'USDC',
    to_token: 'ETH',
  },
  status: 'active',
  totalExecutions: 5,
  successfulExecutions: 5,
  failedExecutions: 0,
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
    // Token pair is now in format: DCA · USDC → ETH
    expect(screen.getByText(/USDC → ETH/)).toBeInTheDocument()
  })

  it('renders status badge', () => {
    render(<StrategyCard {...defaultProps} />)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('renders execution stats', () => {
    render(<StrategyCard {...defaultProps} />)
    // Amount is shown in USD format
    expect(screen.getByText(/\$100/)).toBeInTheDocument()
  })

  it('renders paused status correctly', () => {
    const pausedStrategy: GenericStrategy = { ...mockStrategy, status: 'paused' }
    render(<StrategyCard {...defaultProps} strategy={pausedStrategy} />)
    expect(screen.getByText('Paused')).toBeInTheDocument()
  })

  it('renders draft status correctly', () => {
    const draftStrategy: GenericStrategy = { ...mockStrategy, status: 'draft' }
    render(<StrategyCard {...defaultProps} strategy={draftStrategy} />)
    expect(screen.getByText('Draft')).toBeInTheDocument()
  })
})
