import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ExecutionSigningModal, ExecutionSigningBadge } from '../ExecutionSigningModal'

// Mock the useExecutionSigning hook
const mockUseExecutionSigning = vi.fn()

vi.mock('../../hooks/useExecutionSigning', () => ({
  useExecutionSigning: () => mockUseExecutionSigning(),
}))

vi.mock('../../hooks/usePendingApprovals', () => ({
  formatStrategyType: (type: string) => {
    const labels: Record<string, string> = {
      dca: 'DCA',
      rebalance: 'Rebalance',
      limit_order: 'Limit Order',
    }
    return labels[type] || type
  },
}))

// Mock useSmartSessionIntents (used by ExecutionSigningModal for intent tracking)
vi.mock('../../../hooks/useSmartSessionIntents', () => ({
  useSourceIntents: () => ({ intents: [], isLoading: false }),
}))

// Mock IntentProgressCard
vi.mock('../../../components/intents/IntentProgressCard', () => ({
  IntentProgressCard: ({ intent }: any) => (
    <div data-testid="intent-progress-card">{intent?.status}</div>
  ),
}))

// Mock ModalBase component
vi.mock('../../../components/modals/ModalBase', () => ({
  ModalBase: ({ children, title, footer, onClose }: any) => (
    <div data-testid="modal-base">
      <div data-testid="modal-title">{title}</div>
      <div data-testid="modal-content">{children}</div>
      <div data-testid="modal-footer">{footer}</div>
      <button data-testid="modal-close" onClick={onClose}>Close</button>
    </div>
  ),
}))

describe('ExecutionSigningModal', () => {
  const mockExecution = {
    _id: 'exec-1',
    strategyId: 'strategy-1',
    walletAddress: '0x123',
    currentState: 'executing' as const,
    stateEnteredAt: Date.now(),
    strategy: {
      _id: 'strategy-1',
      name: 'Weekly ETH DCA',
      strategyType: 'dca' as const,
      config: {},
    },
  }

  const mockQuote = {
    amount_in: 100,
    token_in: 'USDC',
    amount_out_est: 0.05,
    token_out: 'ETH',
    price_impact: 0.5,
    gas_estimate: 21000,
  }

  const defaultMockState = {
    state: { status: 'idle', execution: null, quote: null },
    isActive: false,
    isIntentBacked: false,
    statusMessage: '',
    isLoading: false,
    isSuccess: false,
    txHash: undefined,
    approvalTxHash: undefined,
    quote: null,
    execution: null,
    smartSessionId: undefined,
    error: undefined,
    signTransaction: vi.fn(),
    dismiss: vi.fn(),
    reset: vi.fn(),
    pendingCount: 0,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseExecutionSigning.mockReturnValue(defaultMockState)
  })

  it('does not render when not active', () => {
    mockUseExecutionSigning.mockReturnValue({
      ...defaultMockState,
      state: { status: 'idle', execution: null, quote: null },
      isActive: false,
    })

    const { container } = render(<ExecutionSigningModal />)
    expect(container.firstChild).toBeNull()
  })

  it('renders when active and awaiting signature', () => {
    mockUseExecutionSigning.mockReturnValue({
      ...defaultMockState,
      state: { status: 'awaiting_signature', execution: mockExecution, quote: mockQuote },
      isActive: true,
      execution: mockExecution,
      quote: mockQuote,
      statusMessage: 'Ready to sign transaction',
    })

    render(<ExecutionSigningModal />)
    expect(screen.getByTestId('modal-base')).toBeInTheDocument()
    expect(screen.getByText('Weekly ETH DCA')).toBeInTheDocument()
    expect(screen.getByText('DCA')).toBeInTheDocument()
  })

  it('displays quote details when quote is available', () => {
    mockUseExecutionSigning.mockReturnValue({
      ...defaultMockState,
      state: { status: 'awaiting_signature', execution: mockExecution, quote: mockQuote },
      isActive: true,
      execution: mockExecution,
      quote: mockQuote,
    })

    render(<ExecutionSigningModal />)
    expect(screen.getByText('You send')).toBeInTheDocument()
    expect(screen.getByText('100 USDC')).toBeInTheDocument()
    expect(screen.getByText('You receive (est.)')).toBeInTheDocument()
    expect(screen.getByText(/0.0500.*ETH/)).toBeInTheDocument()
  })

  it('shows Sign Transaction button when awaiting signature', () => {
    mockUseExecutionSigning.mockReturnValue({
      ...defaultMockState,
      state: { status: 'awaiting_signature', execution: mockExecution, quote: mockQuote },
      isActive: true,
      execution: mockExecution,
      quote: mockQuote,
    })

    render(<ExecutionSigningModal />)
    expect(screen.getByText('Sign Transaction')).toBeInTheDocument()
  })

  it('calls signTransaction when Sign button is clicked', () => {
    const mockSignTransaction = vi.fn()
    mockUseExecutionSigning.mockReturnValue({
      ...defaultMockState,
      state: { status: 'awaiting_signature', execution: mockExecution, quote: mockQuote },
      isActive: true,
      execution: mockExecution,
      quote: mockQuote,
      signTransaction: mockSignTransaction,
    })

    render(<ExecutionSigningModal />)
    fireEvent.click(screen.getByText('Sign Transaction'))
    expect(mockSignTransaction).toHaveBeenCalled()
  })

  it('shows disabled button while signing', () => {
    mockUseExecutionSigning.mockReturnValue({
      ...defaultMockState,
      state: { status: 'signing', execution: mockExecution, quote: mockQuote },
      isActive: true,
      execution: mockExecution,
      quote: mockQuote,
    })

    render(<ExecutionSigningModal />)
    const button = screen.getByText('Check wallet...')
    expect(button).toBeDisabled()
  })

  it('shows disabled button while confirming', () => {
    mockUseExecutionSigning.mockReturnValue({
      ...defaultMockState,
      state: { status: 'confirming', execution: mockExecution, quote: mockQuote },
      isActive: true,
      execution: mockExecution,
      quote: mockQuote,
    })

    render(<ExecutionSigningModal />)
    const button = screen.getByText('Confirming...')
    expect(button).toBeDisabled()
  })

  it('shows Done button and success message when completed', () => {
    mockUseExecutionSigning.mockReturnValue({
      ...defaultMockState,
      state: { status: 'completed', execution: mockExecution, quote: mockQuote, txHash: '0xabc123' },
      isActive: false,
      execution: mockExecution,
      quote: mockQuote,
      txHash: '0xabc123',
    })

    render(<ExecutionSigningModal />)
    expect(screen.getByText('Done')).toBeInTheDocument()
    expect(screen.getByText('Transaction confirmed!')).toBeInTheDocument()
    expect(screen.getByText('0xabc123')).toBeInTheDocument()
  })

  it('shows error message when failed', () => {
    mockUseExecutionSigning.mockReturnValue({
      ...defaultMockState,
      state: { status: 'failed', execution: mockExecution, quote: null, error: 'Insufficient balance' },
      isActive: false,
      execution: mockExecution,
      error: 'Insufficient balance',
    })

    render(<ExecutionSigningModal />)
    expect(screen.getByText('Insufficient balance')).toBeInTheDocument()
    expect(screen.getByText('Retry')).toBeInTheDocument()
  })

  it('calls reset when Retry button is clicked', () => {
    const mockReset = vi.fn()
    mockUseExecutionSigning.mockReturnValue({
      ...defaultMockState,
      state: { status: 'failed', execution: mockExecution, quote: null, error: 'Error' },
      isActive: false,
      execution: mockExecution,
      error: 'Error',
      reset: mockReset,
    })

    render(<ExecutionSigningModal />)
    fireEvent.click(screen.getByText('Retry'))
    expect(mockReset).toHaveBeenCalled()
  })

  it('calls dismiss when Cancel button is clicked', () => {
    const mockDismiss = vi.fn()
    mockUseExecutionSigning.mockReturnValue({
      ...defaultMockState,
      state: { status: 'awaiting_signature', execution: mockExecution, quote: mockQuote },
      isActive: true,
      execution: mockExecution,
      quote: mockQuote,
      dismiss: mockDismiss,
    })

    render(<ExecutionSigningModal />)
    fireEvent.click(screen.getByText('Cancel'))
    expect(mockDismiss).toHaveBeenCalled()
  })

  it('displays price impact warning when high', () => {
    const highImpactQuote = { ...mockQuote, price_impact: 2.5 }
    mockUseExecutionSigning.mockReturnValue({
      ...defaultMockState,
      state: { status: 'awaiting_signature', execution: mockExecution, quote: highImpactQuote },
      isActive: true,
      execution: mockExecution,
      quote: highImpactQuote,
    })

    render(<ExecutionSigningModal />)
    expect(screen.getByText('Price impact')).toBeInTheDocument()
    expect(screen.getByText('2.50%')).toBeInTheDocument()
  })

  it('displays warnings when present in quote', () => {
    const quoteWithWarnings = { ...mockQuote, warnings: ['Low liquidity', 'High slippage'] }
    mockUseExecutionSigning.mockReturnValue({
      ...defaultMockState,
      state: { status: 'awaiting_signature', execution: mockExecution, quote: quoteWithWarnings },
      isActive: true,
      execution: mockExecution,
      quote: quoteWithWarnings,
    })

    render(<ExecutionSigningModal />)
    expect(screen.getByText('Warnings')).toBeInTheDocument()
    expect(screen.getByText('Low liquidity')).toBeInTheDocument()
    expect(screen.getByText('High slippage')).toBeInTheDocument()
  })
})

describe('ExecutionSigningBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not render when no pending executions and not active', () => {
    mockUseExecutionSigning.mockReturnValue({
      pendingCount: 0,
      isActive: false,
    })

    const { container } = render(<ExecutionSigningBadge />)
    expect(container.firstChild).toBeNull()
  })

  it('renders count badge when there are pending executions', () => {
    mockUseExecutionSigning.mockReturnValue({
      pendingCount: 3,
      isActive: false,
    })

    render(<ExecutionSigningBadge />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders pulsing indicator when active', () => {
    mockUseExecutionSigning.mockReturnValue({
      pendingCount: 0,
      isActive: true,
    })

    const { container } = render(<ExecutionSigningBadge />)
    const pulsingElement = container.querySelector('.animate-ping')
    expect(pulsingElement).toBeInTheDocument()
  })
})

describe('StatusIndicator', () => {
  it('shows correct status for each state', () => {
    const states = [
      { status: 'fetching_quote', expectedText: 'Preparing' },
      { status: 'awaiting_signature', expectedText: 'Ready' },
      { status: 'signing', expectedText: 'Signing' },
      { status: 'confirming', expectedText: 'Confirming' },
      { status: 'completed', expectedText: 'Complete' },
      { status: 'failed', expectedText: 'Failed' },
    ]

    for (const { status, expectedText } of states) {
      mockUseExecutionSigning.mockReturnValue({
        ...{
          state: { status, execution: { strategy: { name: 'Test', strategyType: 'dca' } }, quote: null },
          isActive: status !== 'completed' && status !== 'failed',
          execution: { strategy: { name: 'Test', strategyType: 'dca' } },
          quote: null,
          statusMessage: '',
          isLoading: false,
          isSuccess: false,
          txHash: undefined,
          error: undefined,
          signTransaction: vi.fn(),
          dismiss: vi.fn(),
          reset: vi.fn(),
          pendingCount: 0,
        },
      })

      const { unmount } = render(<ExecutionSigningModal />)
      expect(screen.getByText(expectedText)).toBeInTheDocument()
      unmount()
    }
  })
})
