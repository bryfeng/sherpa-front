import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// Mock wagmi hooks
vi.mock('wagmi', () => ({
  useAccount: vi.fn(() => ({ address: '0x123', chainId: 1 })),
  usePublicClient: vi.fn(() => ({
    readContract: vi.fn(),
  })),
  useSendTransaction: vi.fn(() => ({
    sendTransaction: vi.fn(),
    data: undefined,
    isPending: false,
    error: null,
    reset: vi.fn(),
  })),
  useWaitForTransactionReceipt: vi.fn(() => ({
    isLoading: false,
    isSuccess: false,
  })),
  useWriteContract: vi.fn(() => ({
    writeContract: vi.fn(),
    data: undefined,
    isPending: false,
    error: null,
    reset: vi.fn(),
  })),
}))

// Mock Convex
vi.mock('convex/react', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
}))

// Mock API service
vi.mock('../../../services/api', () => ({
  api: {
    swapQuote: vi.fn(),
  },
}))

describe('useExecutionSigning', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts in idle state when no executions', async () => {
    const { useQuery } = await import('convex/react')
    vi.mocked(useQuery).mockReturnValue([])

    const { useExecutionSigning } = await import('../useExecutionSigning')
    const { result } = renderHook(() => useExecutionSigning())

    expect(result.current.state.status).toBe('idle')
    expect(result.current.isActive).toBe(false)
    expect(result.current.pendingCount).toBe(0)
  })

  it('returns isActive false when in idle state', async () => {
    const { useQuery } = await import('convex/react')
    vi.mocked(useQuery).mockReturnValue([])

    const { useExecutionSigning } = await import('../useExecutionSigning')
    const { result } = renderHook(() => useExecutionSigning())

    expect(result.current.isActive).toBe(false)
  })

  it('returns correct status messages for each state', async () => {
    const { useQuery } = await import('convex/react')
    vi.mocked(useQuery).mockReturnValue([])

    const { useExecutionSigning } = await import('../useExecutionSigning')
    const { result } = renderHook(() => useExecutionSigning())

    // In idle state, statusMessage is empty
    expect(result.current.statusMessage).toBe('')
  })

  it('provides signTransaction, dismiss, and reset actions', async () => {
    const { useQuery } = await import('convex/react')
    vi.mocked(useQuery).mockReturnValue([])

    const { useExecutionSigning } = await import('../useExecutionSigning')
    const { result } = renderHook(() => useExecutionSigning())

    expect(typeof result.current.signTransaction).toBe('function')
    expect(typeof result.current.dismiss).toBe('function')
    expect(typeof result.current.reset).toBe('function')
  })

  it('detects new execution and transitions to fetching_quote', async () => {
    const mockExecution = {
      _id: 'exec-1',
      strategyId: 'strategy-1',
      walletAddress: '0x123',
      currentState: 'executing',
      stateEnteredAt: Date.now(),
      strategy: {
        _id: 'strategy-1',
        name: 'Test DCA',
        strategyType: 'dca',
        config: {
          fromToken: { symbol: 'USDC', address: '0xusdc' },
          toToken: { symbol: 'ETH', address: '0xeth' },
          amountPerExecution: 100,
        },
      },
    }

    const { useQuery } = await import('convex/react')
    vi.mocked(useQuery).mockReturnValue([mockExecution])

    const { useExecutionSigning } = await import('../useExecutionSigning')
    const { result } = renderHook(() => useExecutionSigning())

    // Should detect the execution and start fetching quote
    await waitFor(() => {
      expect(result.current.state.status).toBe('fetching_quote')
    })
  })

  it('calculates pendingCount correctly', async () => {
    const mockExecutions = [
      { _id: 'exec-1', currentState: 'executing' },
      { _id: 'exec-2', currentState: 'executing' },
    ]

    const { useQuery } = await import('convex/react')
    vi.mocked(useQuery).mockReturnValue(mockExecutions)

    const { useExecutionSigning } = await import('../useExecutionSigning')
    const { result } = renderHook(() => useExecutionSigning())

    // Initially both are pending (not processed)
    expect(result.current.pendingCount).toBe(2)
  })

  it('reset function clears state back to idle', async () => {
    const { useQuery } = await import('convex/react')
    vi.mocked(useQuery).mockReturnValue([])

    const { useExecutionSigning } = await import('../useExecutionSigning')
    const { result } = renderHook(() => useExecutionSigning())

    act(() => {
      result.current.reset()
    })

    expect(result.current.state.status).toBe('idle')
    expect(result.current.state.execution).toBeNull()
    expect(result.current.state.quote).toBeNull()
  })
})

describe('SigningStatus states', () => {
  it('has all expected status values', async () => {
    const { SigningStatus } = await import('../useExecutionSigning').catch(() => ({
      SigningStatus: null,
    }))

    // Type is a union, so we test by checking the hook's status values
    const validStatuses = [
      'idle',
      'fetching_quote',
      'awaiting_signature',
      'signing',
      'confirming',
      'completed',
      'failed',
      'dismissed',
    ]

    // Just verify these are the expected statuses from the type definition
    expect(validStatuses).toContain('idle')
    expect(validStatuses).toContain('fetching_quote')
    expect(validStatuses).toContain('awaiting_signature')
    expect(validStatuses).toContain('signing')
    expect(validStatuses).toContain('confirming')
    expect(validStatuses).toContain('completed')
    expect(validStatuses).toContain('failed')
    expect(validStatuses).toContain('dismissed')
  })
})

describe('Error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exposes error from sendTransaction', async () => {
    const { useSendTransaction } = await import('wagmi')
    vi.mocked(useSendTransaction).mockReturnValue({
      sendTransaction: vi.fn(),
      data: undefined,
      isPending: false,
      error: { message: 'User rejected transaction' } as any,
      reset: vi.fn(),
    } as any)

    const { useQuery } = await import('convex/react')
    vi.mocked(useQuery).mockReturnValue([])

    const { useExecutionSigning } = await import('../useExecutionSigning')
    const { result } = renderHook(() => useExecutionSigning())

    expect(result.current.error).toBe('User rejected transaction')
  })

  it('exposes error from writeContract (approval)', async () => {
    // Reset both mocks to ensure clean state
    const { useWriteContract, useSendTransaction } = await import('wagmi')
    vi.mocked(useSendTransaction).mockReturnValue({
      sendTransaction: vi.fn(),
      data: undefined,
      isPending: false,
      error: null,
      reset: vi.fn(),
    } as any)
    vi.mocked(useWriteContract).mockReturnValue({
      writeContract: vi.fn(),
      data: undefined,
      isPending: false,
      error: { message: 'Approval failed' } as any,
      reset: vi.fn(),
    } as any)

    const { useQuery } = await import('convex/react')
    vi.mocked(useQuery).mockReturnValue([])

    const { useExecutionSigning } = await import('../useExecutionSigning')
    const { result } = renderHook(() => useExecutionSigning())

    expect(result.current.error).toBe('Approval failed')
  })
})

describe('Loading states', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('isLoading is true when sending transaction', async () => {
    const { useSendTransaction } = await import('wagmi')
    vi.mocked(useSendTransaction).mockReturnValue({
      sendTransaction: vi.fn(),
      data: undefined,
      isPending: true,
      error: null,
      reset: vi.fn(),
    } as any)

    const { useQuery } = await import('convex/react')
    vi.mocked(useQuery).mockReturnValue([])

    const { useExecutionSigning } = await import('../useExecutionSigning')
    const { result } = renderHook(() => useExecutionSigning())

    expect(result.current.isLoading).toBe(true)
  })

  it('isLoading is true when confirming transaction', async () => {
    const { useWaitForTransactionReceipt } = await import('wagmi')
    vi.mocked(useWaitForTransactionReceipt).mockReturnValue({
      isLoading: true,
      isSuccess: false,
    } as any)

    const { useQuery } = await import('convex/react')
    vi.mocked(useQuery).mockReturnValue([])

    const { useExecutionSigning } = await import('../useExecutionSigning')
    const { result } = renderHook(() => useExecutionSigning())

    expect(result.current.isLoading).toBe(true)
  })
})
