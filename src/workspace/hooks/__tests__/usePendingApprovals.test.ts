import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import {
  formatWaitingTime,
  getUrgencyLevel,
  formatStrategyType,
} from '../usePendingApprovals'

// Mock Convex
vi.mock('convex/react', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
}))

describe('usePendingApprovals', () => {
  describe('formatWaitingTime', () => {
    it('returns "Just now" for times less than 1 minute ago', () => {
      const now = Date.now()
      expect(formatWaitingTime(now)).toBe('Just now')
      expect(formatWaitingTime(now - 30000)).toBe('Just now') // 30 seconds
    })

    it('returns minutes for times less than 1 hour ago', () => {
      const now = Date.now()
      expect(formatWaitingTime(now - 5 * 60 * 1000)).toBe('5m ago')
      expect(formatWaitingTime(now - 30 * 60 * 1000)).toBe('30m ago')
      expect(formatWaitingTime(now - 59 * 60 * 1000)).toBe('59m ago')
    })

    it('returns hours for times less than 1 day ago', () => {
      const now = Date.now()
      expect(formatWaitingTime(now - 1 * 60 * 60 * 1000)).toBe('1h ago')
      expect(formatWaitingTime(now - 5 * 60 * 60 * 1000)).toBe('5h ago')
      expect(formatWaitingTime(now - 23 * 60 * 60 * 1000)).toBe('23h ago')
    })

    it('returns days for times more than 1 day ago', () => {
      const now = Date.now()
      expect(formatWaitingTime(now - 1 * 24 * 60 * 60 * 1000)).toBe('1d ago')
      expect(formatWaitingTime(now - 7 * 24 * 60 * 60 * 1000)).toBe('7d ago')
    })
  })

  describe('getUrgencyLevel', () => {
    it('returns "normal" for recent executions', () => {
      const now = Date.now()
      expect(getUrgencyLevel(now)).toBe('normal')
      expect(getUrgencyLevel(now - 30 * 60 * 1000)).toBe('normal') // 30 min
    })

    it('returns "warning" for executions older than 1 hour', () => {
      const now = Date.now()
      expect(getUrgencyLevel(now - 2 * 60 * 60 * 1000)).toBe('warning') // 2 hours
      expect(getUrgencyLevel(now - 12 * 60 * 60 * 1000)).toBe('warning') // 12 hours
    })

    it('returns "urgent" for executions older than 24 hours', () => {
      const now = Date.now()
      expect(getUrgencyLevel(now - 25 * 60 * 60 * 1000)).toBe('urgent') // 25 hours
      expect(getUrgencyLevel(now - 48 * 60 * 60 * 1000)).toBe('urgent') // 2 days
    })
  })

  describe('formatStrategyType', () => {
    it('formats DCA correctly', () => {
      expect(formatStrategyType('dca')).toBe('DCA')
    })

    it('formats rebalance correctly', () => {
      expect(formatStrategyType('rebalance')).toBe('Rebalance')
    })

    it('formats limit_order correctly', () => {
      expect(formatStrategyType('limit_order')).toBe('Limit Order')
    })

    it('formats stop_loss correctly', () => {
      expect(formatStrategyType('stop_loss')).toBe('Stop Loss')
    })

    it('formats take_profit correctly', () => {
      expect(formatStrategyType('take_profit')).toBe('Take Profit')
    })

    it('formats custom correctly', () => {
      expect(formatStrategyType('custom')).toBe('Custom')
    })

    it('returns the type itself for unknown types', () => {
      // @ts-expect-error - testing unknown type
      expect(formatStrategyType('unknown')).toBe('unknown')
    })
  })
})

describe('usePendingApprovals hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty state when no wallet address', async () => {
    const { useQuery } = await import('convex/react')
    vi.mocked(useQuery).mockReturnValue(undefined)

    const { usePendingApprovals } = await import('../usePendingApprovals')
    const { result } = renderHook(() => usePendingApprovals(null))

    expect(result.current.isLoading).toBe(true)
    expect(result.current.executions).toEqual([])
    expect(result.current.count).toBe(0)
  })

  it('returns executions when wallet is connected', async () => {
    const mockExecutions = [
      {
        _id: 'exec-1',
        strategyId: 'strategy-1',
        walletAddress: '0x123',
        currentState: 'awaiting_approval',
        createdAt: Date.now() - 30 * 60 * 1000, // 30 min ago
        strategy: { name: 'Test DCA', strategyType: 'dca' },
      },
    ]

    const { useQuery } = await import('convex/react')
    vi.mocked(useQuery).mockReturnValue(mockExecutions)

    const { usePendingApprovals } = await import('../usePendingApprovals')
    const { result } = renderHook(() => usePendingApprovals('0x123'))

    expect(result.current.isLoading).toBe(false)
    expect(result.current.executions).toHaveLength(1)
    expect(result.current.count).toBe(1)
    expect(result.current.isEmpty).toBe(false)
  })

  it('returns isEmpty true when no executions', async () => {
    const { useQuery } = await import('convex/react')
    vi.mocked(useQuery).mockReturnValue([])

    const { usePendingApprovals } = await import('../usePendingApprovals')
    const { result } = renderHook(() => usePendingApprovals('0x123'))

    expect(result.current.isLoading).toBe(false)
    expect(result.current.isEmpty).toBe(true)
    expect(result.current.count).toBe(0)
  })

  it('calculates hasUrgent correctly', async () => {
    const mockExecutions = [
      {
        _id: 'exec-1',
        createdAt: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago (urgent)
      },
      {
        _id: 'exec-2',
        createdAt: Date.now() - 10 * 60 * 1000, // 10 min ago (normal)
      },
    ]

    const { useQuery } = await import('convex/react')
    vi.mocked(useQuery).mockReturnValue(mockExecutions)

    const { usePendingApprovals } = await import('../usePendingApprovals')
    const { result } = renderHook(() => usePendingApprovals('0x123'))

    expect(result.current.data?.hasUrgent).toBe(true)
  })
})

describe('useExecutionMutations hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('provides approve, skip, complete, fail functions', async () => {
    const mockMutation = vi.fn()
    const { useMutation } = await import('convex/react')
    vi.mocked(useMutation).mockReturnValue(mockMutation)

    const { useExecutionMutations } = await import('../usePendingApprovals')
    const { result } = renderHook(() => useExecutionMutations())

    expect(typeof result.current.approve).toBe('function')
    expect(typeof result.current.skip).toBe('function')
    expect(typeof result.current.complete).toBe('function')
    expect(typeof result.current.fail).toBe('function')
  })
})
