import { render, screen } from '@testing-library/react'
import { StrategiesWidget } from '../StrategiesWidget'

// Mock the hooks
vi.mock('../../../hooks/useStrategies', () => ({
  useStrategies: vi.fn(() => ({
    strategies: [],
    isLoading: false,
    isEmpty: true,
  })),
  useStrategyMutations: vi.fn(() => ({
    create: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    stop: vi.fn(),
    updateConfig: vi.fn(),
  })),
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
