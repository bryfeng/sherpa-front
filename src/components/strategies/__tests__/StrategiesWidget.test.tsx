import { render, screen } from '@testing-library/react'
import { StrategiesWidget } from '../StrategiesWidget'

// Mock wagmi
vi.mock('wagmi', () => ({
  useAccount: vi.fn(() => ({ address: null })),
}))

// Mock the hooks
vi.mock('../../../hooks/useStrategies', () => ({
  useGenericStrategies: vi.fn(() => ({
    strategies: [],
    isLoading: false,
    isEmpty: true,
  })),
  useGenericStrategyMutations: vi.fn(() => ({
    activate: vi.fn(),
    pause: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    executeNow: vi.fn(),
  })),
  formatNextExecution: vi.fn(() => 'Next: in 1 hour'),
}))

// Mock pending approvals
vi.mock('../../../workspace/hooks/usePendingApprovals', () => ({
  useExecutionHistory: vi.fn(() => ({ executions: [], isLoading: false })),
  useExecutionMutations: vi.fn(() => ({ approve: vi.fn(), reject: vi.fn() })),
  formatWaitingTime: vi.fn(() => '5 min'),
  getUrgencyLevel: vi.fn(() => 'normal'),
}))

describe('StrategiesWidget', () => {
  it('renders connect wallet message when no wallet', () => {
    render(<StrategiesWidget walletAddress={null} />)
    expect(screen.getByText(/Connect your wallet/i)).toBeInTheDocument()
  })

  it('renders empty state when connected but no strategies', () => {
    render(<StrategiesWidget walletAddress="0x123" />)
    expect(screen.getByText('No strategies yet')).toBeInTheDocument()
  })

  it('renders create button in empty state', () => {
    render(<StrategiesWidget walletAddress="0x123" />)
    expect(screen.getByText('Create Strategy')).toBeInTheDocument()
  })
})
