import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { HistoryComparisonTable } from '../HistoryComparisonTable'
import type { HistoryComparisonReport } from '../../../../types/history'

const report: HistoryComparisonReport = {
  baselineWindow: { start: '2024-09-01T00:00:00Z', end: '2024-09-30T00:00:00Z' },
  comparisonWindow: { start: '2024-10-01T00:00:00Z', end: '2024-10-31T00:00:00Z' },
  metricDeltas: [
    {
      metric: 'inflowUsd',
      baselineValueUsd: 1000,
      comparisonValueUsd: 2000,
      deltaPct: 1,
      direction: 'up',
    },
  ],
  thresholdFlags: [
    { metric: 'inflowUsd', direction: 'up', magnitudePct: 1 },
  ],
  supportingTables: [
    { name: 'protocols', baseline: [{ name: 'dex', usd: 600 }], comparison: [{ name: 'dex', usd: 1200 }] },
  ],
}

describe('HistoryComparisonTable', () => {
  it('renders metric comparison rows', () => {
    render(<HistoryComparisonTable report={report} />)
    expect(screen.getAllByText(/Inflow/)).toHaveLength(2)
    expect(screen.getByText(/Significant changes/)).toBeInTheDocument()
  })
})
