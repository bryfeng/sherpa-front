import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { HistorySummaryPanel } from '../HistorySummaryPanel'
import type { Widget } from '../../../../types/widgets'
import type { HistorySummaryResponse } from '../../../../types/history'

// Mock Date.now() to return a fixed date for consistent snapshots
// This date is ~1 year after the test data dates (Oct 2024)
const MOCK_NOW = new Date('2025-10-15T00:00:00Z').getTime()

const widget: Widget<HistorySummaryResponse> = {
  id: 'history-summary',
  kind: 'history-summary',
  title: 'History',
  density: 'rail',
  payload: {
    walletAddress: '0xabc',
    chain: 'ethereum',
    timeWindow: {
      start: '2024-10-01T00:00:00Z',
      end: '2024-10-31T00:00:00Z',
    },
    bucketSize: 'week',
    totals: { inflow: 1, outflow: 0.5, inflowUsd: 1000, outflowUsd: 500, feeUsd: 10 },
    notableEvents: [{ type: 'large_outflow', severity: 'warning', summary: 'Large outflows detected' }],
    buckets: [
      {
        start: '2024-10-01T00:00:00Z',
        end: '2024-10-08T00:00:00Z',
        inflow: 1,
        outflow: 0.4,
        inflowUsd: 1000,
        outflowUsd: 400,
        feeUsd: 5,
        transactionsSample: [
          {
            timestamp: '2024-10-03T00:00:00Z',
            symbol: 'ETH',
            direction: 'inflow',
            usd_value: 1000,
            tx_hash: '0x123',
          },
        ],
      },
    ],
    exportRefs: [
      {
        exportId: 'exp-1',
        format: 'csv',
        status: 'ready',
        downloadUrl: '/download',
        createdAt: '2024-10-31T00:00:00Z',
        expiresAt: '2024-11-01T00:00:00Z',
        error: null,
      },
    ],
    generatedAt: '2024-10-31T00:00:00Z',
    cached: false,
  },
}

const clampedWidget: Widget<HistorySummaryResponse> = {
  ...widget,
  payload: {
    ...widget.payload,
    metadata: {
      windowClamped: true,
      requestedWindow: { start: '2024-01-01T00:00:00Z', end: '2024-05-01T00:00:00Z' },
      clampedWindowDays: 90,
      retryAfterSeconds: 600,
    },
    exportRefs: [
      {
        exportId: 'exp-queued',
        format: 'csv',
        status: 'pending',
        createdAt: '2024-10-31T00:00:00Z',
        expiresAt: '2024-11-02T00:00:00Z',
        error: null,
      },
    ],
  },
}

const limitWidget: Widget<HistorySummaryResponse> = {
  ...widget,
  payload: {
    ...widget.payload,
    metadata: {
      sampleLimit: 50,
    },
    buckets: [],
    totals: { inflow: 0, outflow: 0, inflowUsd: 0, outflowUsd: 0, feeUsd: 0 },
  },
}

describe('HistorySummaryPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(MOCK_NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders totals, buckets, and exports', () => {
    const { container, getByText } = render(<HistorySummaryPanel widget={widget} />)
    expect(getByText(/Total inflow/i)).toBeInTheDocument()
    expect(getByText(/History summary/i)).toBeInTheDocument()
    expect(container).toMatchSnapshot()
  })

  it('shows clamped window and queued export banners', () => {
    const { getByText } = render(<HistorySummaryPanel widget={clampedWidget} />)
    expect(getByText(/exceeds the 90-day sync limit/i)).toBeInTheDocument()
    expect(getByText(/we'll drop the download link here when it's ready/i)).toBeInTheDocument()
  })

  it('hides date subtitles for limit summaries and shows empty-state messaging', () => {
    const { getByRole, getByText, queryByText } = render(<HistorySummaryPanel widget={limitWidget} />)
    expect(getByRole('heading', { name: /Latest 50 transactions/i })).toBeInTheDocument()
    expect(getByText(/No transfers found/i)).toBeInTheDocument()
    expect(queryByText(/Window/i)).toBeNull()
  })
})
